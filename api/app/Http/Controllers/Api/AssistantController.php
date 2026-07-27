<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssistantConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AssistantController extends Controller
{
    // ── GET /assistant/config ─────────────────────────────────────────────────
    public function config(Request $request)
    {
        $this->requireAccess($request);
        $cfg = AssistantConfig::get();

        return response()->json([
            'provider'      => $cfg->provider,
            'model'         => $cfg->model,
            'system_prompt' => $cfg->system_prompt,
            'max_tokens'    => $cfg->max_tokens,
            'temperature'   => $cfg->temperature,
            'is_active'     => $cfg->is_active,
            'has_api_key'   => $cfg->hasApiKey(),
        ]);
    }

    // ── PUT /assistant/config ─────────────────────────────────────────────────
    public function updateConfig(Request $request)
    {
        $this->requireAccess($request);

        $data = $request->validate([
            'provider'      => ['sometimes', 'in:claude,openai'],
            'api_key'       => ['nullable', 'string', 'max:500'],
            'model'         => ['sometimes', 'string', 'max:100'],
            'system_prompt' => ['nullable', 'string', 'max:5000'],
            'max_tokens'    => ['sometimes', 'integer', 'min:100', 'max:8000'],
            'temperature'   => ['sometimes', 'numeric', 'min:0', 'max:2'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $cfg = AssistantConfig::get();

        if (array_key_exists('api_key', $data) && $data['api_key'] === '') {
            unset($data['api_key']);
        }

        $cfg->update($data);
        $cfg->refresh();

        return response()->json([
            'message'       => 'Configuration mise à jour.',
            'provider'      => $cfg->provider,
            'model'         => $cfg->model,
            'system_prompt' => $cfg->system_prompt,
            'max_tokens'    => $cfg->max_tokens,
            'temperature'   => $cfg->temperature,
            'is_active'     => $cfg->is_active,
            'has_api_key'   => $cfg->hasApiKey(),
        ]);
    }

    // ── POST /assistant/test ──────────────────────────────────────────────────
    public function test(Request $request)
    {
        $this->requireAccess($request);
        $cfg = AssistantConfig::get();

        if (! $cfg->hasApiKey()) {
            return response()->json(['ok' => false, 'message' => 'Aucune clé API configurée.'], 422);
        }

        try {
            $result = $this->callClaude($cfg, [
                ['role' => 'user', 'content' => 'Réponds juste "OK" pour confirmer la connexion.'],
            ]);
            return response()->json(['ok' => true, 'message' => 'Connexion réussie — ' . $result]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── POST /assistant/upload ────────────────────────────────────────────────
    public function upload(Request $request)
    {
        $this->requireAccess($request);

        $request->validate([
            'file' => [
                'required', 'file',
                'max:10240',  // 10 MB
                'mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,txt,csv',
            ],
        ]);

        $file     = $request->file('file');
        $mime     = $file->getMimeType() ?? $file->getClientMimeType();
        $filename = $file->getClientOriginalName();
        $sizeKb   = round($file->getSize() / 1024, 1);

        // ── Images → base64 (Claude Vision) ──
        if (str_starts_with($mime, 'image/')) {
            return response()->json([
                'type'     => 'image',
                'content'  => base64_encode(file_get_contents($file->getRealPath())),
                'mime'     => $mime,
                'filename' => $filename,
                'size_kb'  => $sizeKb,
            ]);
        }

        // ── PDF → base64 (Claude Document nativ) ──
        if ($mime === 'application/pdf') {
            return response()->json([
                'type'     => 'document',
                'content'  => base64_encode(file_get_contents($file->getRealPath())),
                'mime'     => 'application/pdf',
                'filename' => $filename,
                'size_kb'  => $sizeKb,
            ]);
        }

        // ── DOCX → extraction texte via ZipArchive (PHP natif) ──
        $isDocx = in_array($mime, [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ]) || str_ends_with(strtolower($filename), '.docx');

        if ($isDocx) {
            $text = $this->extractDocxText($file->getRealPath());
            return response()->json([
                'type'     => 'text',
                'content'  => $text ?: '(Impossible d\'extraire le texte de ce fichier Word)',
                'filename' => $filename,
                'size_kb'  => $sizeKb,
            ]);
        }

        // ── TXT / CSV → lecture directe ──
        $raw = file_get_contents($file->getRealPath());
        if ($raw === false) {
            return response()->json(['message' => 'Impossible de lire le fichier.'], 422);
        }

        return response()->json([
            'type'     => 'text',
            'content'  => mb_convert_encoding($raw, 'UTF-8', 'auto'),
            'filename' => $filename,
            'size_kb'  => $sizeKb,
        ]);
    }

    // ── POST /assistant/chat ──────────────────────────────────────────────────
    public function chat(Request $request)
    {
        $this->requireAccess($request);

        $data = $request->validate([
            'message'           => ['required', 'string', 'max:4000'],
            'history'           => ['array'],
            'history.*.role'    => ['in:user,assistant'],
            'history.*.content' => ['string'],
            // Fichier optionnel (déjà uploadé et encodé)
            'file'              => ['nullable', 'array'],
            'file.type'         => ['required_with:file', 'in:image,document,text'],
            'file.content'      => ['required_with:file', 'string'],
            'file.mime'         => ['nullable', 'string'],
            'file.filename'     => ['nullable', 'string'],
        ]);

        $cfg = AssistantConfig::get();

        if (! $cfg->is_active) {
            return response()->json(['message' => "L'assistant n'est pas activé."], 422);
        }
        if (! $cfg->hasApiKey()) {
            return response()->json(['message' => 'Clé API manquante. Configurez-la dans Paramètres → Assistant IA.'], 422);
        }

        // ── Construire le message utilisateur courant ──
        $fileData    = $data['file'] ?? null;
        $userContent = $this->buildUserContent($data['message'], $fileData);

        $messages = array_merge(
            $data['history'] ?? [],
            [['role' => 'user', 'content' => $userContent]]
        );

        try {
            $reply = $this->callClaude($cfg, $messages);
            return response()->json(['reply' => $reply]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erreur API : ' . $e->getMessage()], 500);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function requireAccess(Request $request): void
    {
        abort_unless($request->user()?->hasFullAccess(), 403, 'Accès réservé aux administrateurs RH.');
    }

    /**
     * Construit le contenu du message utilisateur.
     * - Texte seul     → string simple
     * - Image          → tableau [image_block, text_block] (Claude Vision)
     * - PDF            → tableau [document_block, text_block] (Claude Document)
     * - Texte extrait  → string avec le contenu du doc en contexte
     */
    private function buildUserContent(string $message, ?array $file): mixed
    {
        if (! $file) return $message;

        $filename = $file['filename'] ?? 'document';

        return match ($file['type']) {
            'image' => [
                [
                    'type'   => 'image',
                    'source' => [
                        'type'       => 'base64',
                        'media_type' => $file['mime'] ?? 'image/jpeg',
                        'data'       => $file['content'],
                    ],
                ],
                ['type' => 'text', 'text' => $message],
            ],

            'document' => [
                [
                    'type'   => 'document',
                    'source' => [
                        'type'       => 'base64',
                        'media_type' => 'application/pdf',
                        'data'       => $file['content'],
                    ],
                ],
                ['type' => 'text', 'text' => $message],
            ],

            'text' => implode("\n\n", [
                "=== Document joint : {$filename} ===",
                $file['content'],
                "=== Fin du document ===",
                $message,
            ]),

            default => $message,
        };
    }

    private function callClaude(AssistantConfig $cfg, array $messages): string
    {
        $apiKey = $cfg->getDecryptedApiKey();

        $payload = [
            'model'      => $cfg->model,
            'max_tokens' => $cfg->max_tokens,
            'messages'   => $messages,
        ];

        if ($cfg->system_prompt) {
            $payload['system'] = $cfg->system_prompt;
        }

        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])
        ->timeout(60)
        ->post('https://api.anthropic.com/v1/messages', $payload);

        if ($response->failed()) {
            $err = $response->json('error.message') ?? $response->body();
            throw new \RuntimeException($err);
        }

        return $response->json('content.0.text') ?? '';
    }

    // ── Extraction texte DOCX (ZipArchive PHP natif) ──────────────────────────
    private function extractDocxText(string $path): string
    {
        if (! class_exists('ZipArchive')) return '';

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) return '';

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if (! $xml) return '';

        // Remplacer fin de paragraphe et saut de ligne par \n
        $text = preg_replace(['/<\/w:p>/', '/<w:br[^\/]*\/>/'], "\n", $xml);
        $text = strip_tags($text ?? '');
        // Nettoyer les espaces multiples tout en conservant les sauts de ligne
        $text = preg_replace('/[ \t]+/', ' ', $text ?? '');
        $text = preg_replace('/\n{3,}/', "\n\n", $text ?? '');

        return trim($text ?? '');
    }
}
