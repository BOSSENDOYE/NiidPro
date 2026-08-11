<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IAConversation;
use App\Models\IAFile;
use App\Services\IA\ClaudeAgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AgentIAController extends Controller
{
    public function __construct(private ClaudeAgentService $agentService) {}

    // ── Conversation ──────────────────────────────────────────────────────────

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'file_id' => 'nullable|integer|exists:ia_files,id',
        ]);

        $user    = $request->user();
        $message = $request->input('message');
        $fileId  = $request->input('file_id');

        $conversation = IAConversation::firstOrCreate(['user_id' => $user->id]);

        $history = $conversation->messages()
            ->orderBy('created_at')
            ->latest()
            ->limit(20)
            ->get()
            ->reverse()
            ->values()
            ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        // Message courant, enrichi d'un fichier si fourni
        $userContent = $this->buildUserContent($message, $fileId, $user);
        $messages    = array_merge($history, [['role' => 'user', 'content' => $userContent]]);

        try {
            $reply = $this->agentService->run($messages, $user);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }

        // Persiste le texte brut (pas le contenu du fichier)
        $conversation->messages()->createMany([
            ['role' => 'user',      'content' => $message],
            ['role' => 'assistant', 'content' => $reply],
        ]);

        return response()->json(['reply' => $reply]);
    }

    public function clearHistory(Request $request): JsonResponse
    {
        $user = $request->user();
        IAConversation::where('user_id', $user->id)
            ->get()
            ->each(fn($c) => $c->messages()->delete());
        return response()->json(['message' => 'Historique effacé.']);
    }

    // ── Fichiers / Bibliothèque ───────────────────────────────────────────────

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:5120|mimes:txt,csv,json,md,pdf,jpg,jpeg,png,gif,webp,doc,docx',
        ]);

        $user         = $request->user();
        $uploaded     = $request->file('file');
        $conversation = IAConversation::firstOrCreate(['user_id' => $user->id]);

        $mediaType   = $uploaded->getMimeType() ?? 'application/octet-stream';
        $storagePath = $uploaded->store("ia-files/{$user->id}", 'local');
        $sizeKb      = (int) ceil($uploaded->getSize() / 1024);

        // Extraction du contenu texte
        $content    = null;
        $textMimes  = ['text/plain', 'text/csv', 'text/markdown', 'application/json'];
        if (in_array($mediaType, $textMimes)) {
            $content = mb_substr(file_get_contents($uploaded->getRealPath()), 0, 60000);
        }

        $file = IAFile::create([
            'user_id'         => $user->id,
            'conversation_id' => $conversation->id,
            'filename'        => $uploaded->getClientOriginalName(),
            'path'            => $storagePath,
            'media_type'      => $mediaType,
            'content'         => $content,
            'size_kb'         => $sizeKb,
            'is_persistent'   => false,
        ]);

        return response()->json($this->fileResource($file), 201);
    }

    public function listFiles(Request $request): JsonResponse
    {
        $files = IAFile::where('user_id', $request->user()->id)
            ->orderByDesc('is_persistent')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($f) => $this->fileResource($f));

        return response()->json($files);
    }

    public function deleteFile(Request $request, int $id): JsonResponse
    {
        $file = IAFile::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        Storage::delete($file->path);
        $file->delete();
        return response()->json(['message' => 'Fichier supprimé.']);
    }

    public function togglePersistent(Request $request, int $id): JsonResponse
    {
        $file = IAFile::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $file->update(['is_persistent' => ! $file->is_persistent]);
        return response()->json($this->fileResource($file));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildUserContent(string $message, ?int $fileId, $user): string|array
    {
        if (! $fileId) return $message;

        $file = IAFile::where('id', $fileId)->where('user_id', $user->id)->first();
        if (! $file) return $message;

        // Image → vision
        if (str_starts_with($file->media_type, 'image/')) {
            $data = base64_encode(Storage::get($file->path));
            return [
                ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $file->media_type, 'data' => $data]],
                ['type' => 'text',  'text'   => $message],
            ];
        }

        // PDF → document API
        if ($file->media_type === 'application/pdf') {
            $data = base64_encode(Storage::get($file->path));
            return [
                ['type' => 'document', 'source' => ['type' => 'base64', 'media_type' => 'application/pdf', 'data' => $data]],
                ['type' => 'text',     'text'   => $message],
            ];
        }

        // Texte → injection directe
        if ($file->content) {
            return "[Fichier joint : {$file->filename}]\n---\n{$file->content}\n---\n\n{$message}";
        }

        return $message;
    }

    private function fileResource(IAFile $file): array
    {
        return [
            'id'            => $file->id,
            'filename'      => $file->filename,
            'media_type'    => $file->media_type,
            'size_kb'       => $file->size_kb,
            'is_persistent' => $file->is_persistent,
            'type_label'    => $file->typeLabel(),
            'created_at'    => $file->created_at?->toDateTimeString(),
        ];
    }
}
