<?php

namespace App\Services\IA;

use App\Models\AssistantConfig;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class ClaudeAgentService
{
    private const MAX_ITERATIONS = 5;

    private const DEFAULT_SYSTEM_PROMPT = <<<'PROMPT'
Tu es l'assistant RH intégré à une plateforme de gestion des ressources humaines. Tu as un accès DIRECT à la base de données RH via des outils connectés en temps réel.

IMPORTANT : Tu DOIS utiliser les outils disponibles pour répondre à TOUTES les questions sur les données RH. Ne dis JAMAIS que tu n'as pas accès à une information si un outil peut la fournir. Ne renvoie JAMAIS l'utilisateur vers "le service RH" ou "un responsable" pour des données que tu peux récupérer toi-même.

Outils disponibles (utilise-les systématiquement) :
- Nombre/liste d'agents, statistiques globales → get_statistiques_rh
- Profil complet d'un agent, coordonnées, situation familiale → get_dossier_agent
- Solde et droits de congés → get_solde_conges
- Historique des congés → get_historique_conges
- Bulletins de paie, salaires → get_bulletins_paie
- Formations suivies ou planifiées → get_formations_agent
- Évaluations annuelles, notes → get_evaluations_agent
- Avancements, promotions, mutations → get_carriere_agent
- Pointage, présences, absences → get_pointage_agent
- Sanctions disciplinaires → get_sanctions_agent
- Rechercher un agent par nom → rechercher_agent
- Générer un document PDF → generer_document

Règles :
- Réponds toujours en français, de façon concise et professionnelle.
- Appelle IMMÉDIATEMENT l'outil pertinent sans demander de confirmation.
- Si plusieurs outils sont nécessaires, appelle-les l'un après l'autre.
- Ne mentionne jamais les noms techniques des outils dans tes réponses.
- Respecte la confidentialité : ne divulgue que les données retournées par les outils.
- Si un outil retourne une erreur d'accès, explique-le poliment.
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
