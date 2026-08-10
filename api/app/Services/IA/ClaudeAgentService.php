<?php

namespace App\Services\IA;

use App\Models\AssistantConfig;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class ClaudeAgentService
{
    private const MAX_ITERATIONS = 5;

    private const DEFAULT_SYSTEM_PROMPT = <<<'PROMPT'
Tu es l'assistant RH de NiidPro, une plateforme de gestion des ressources humaines.
Tu aides les utilisateurs à consulter des informations RH : soldes de congés, fiches agents, contrats, etc.

Règles strictes :
- Réponds toujours en français, de façon concise et professionnelle.
- N'invente jamais de données. Si tu as besoin d'une information, appelle l'outil approprié.
- Si l'outil retourne une erreur ou un accès refusé, explique-le clairement à l'utilisateur.
- Ne mentionne jamais les noms internes des outils dans tes réponses.
- Respecte la confidentialité : ne divulgue que les informations retournées par les outils.
PROMPT;

    public function __construct(private ToolRegistry $toolRegistry) {}

    /**
     * Exécute la boucle agent avec Claude et retourne la réponse finale en texte.
     *
     * @param  array  $messages  Historique au format [['role' => 'user'|'assistant', 'content' => '...']]
     * @throws \RuntimeException si la clé API n'est pas configurée
     */
    public function run(array $messages, User $user): string
    {
        $cfg    = AssistantConfig::get();
        $apiKey = $cfg->getDecryptedApiKey() ?? config('services.anthropic.key');

        if (! $apiKey) {
            throw new \RuntimeException('Clé API Anthropic non configurée. Allez dans Configuration → Assistant IA.');
        }

        $model   = $cfg->model ?? config('services.anthropic.model', 'claude-sonnet-5');
        $tools   = $this->toolRegistry->schemaForClaude();

        // Le prompt personnalisé enrichit le contexte, mais les règles outils restent toujours actives
        $customContext = trim($cfg->system_prompt ?? '');
        $systemPrompt  = $customContext
            ? $customContext . "\n\n" . self::DEFAULT_SYSTEM_PROMPT
            : self::DEFAULT_SYSTEM_PROMPT;

        for ($i = 0; $i < self::MAX_ITERATIONS; $i++) {
            $response = Http::withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'      => $model,
                'max_tokens' => 1024,
                'system'     => $systemPrompt,
                'tools'      => $tools,
                'messages'   => $messages,
            ])->throw()->json();

            $content    = $response['content']    ?? [];
            $stopReason = $response['stop_reason'] ?? 'end_turn';

            if ($stopReason !== 'tool_use') {
                foreach ($content as $block) {
                    if ($block['type'] === 'text') {
                        return $block['text'];
                    }
                }
                return 'Je n\'ai pas pu générer une réponse.';
            }

            // Ajouter le message assistant contenant les blocs tool_use
            $messages[] = ['role' => 'assistant', 'content' => $content];

            // Exécuter chaque outil demandé et construire les tool_result
            $toolResults = [];
            foreach ($content as $block) {
                if ($block['type'] === 'tool_use') {
                    $result        = $this->toolRegistry->run($block['name'], $block['input'] ?? [], $user);
                    $toolResults[] = [
                        'type'        => 'tool_result',
                        'tool_use_id' => $block['id'],
                        'content'     => json_encode($result, JSON_UNESCAPED_UNICODE),
                    ];
                }
            }

            $messages[] = ['role' => 'user', 'content' => $toolResults];
        }

        return 'La limite de traitement a été atteinte. Veuillez reformuler votre question.';
    }
}
