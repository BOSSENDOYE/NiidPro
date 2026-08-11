<?php

namespace App\Services\IA;

use App\Models\AssistantConfig;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class ClaudeAgentService
{
    private const MAX_ITERATIONS = 5;

    private const DEFAULT_SYSTEM_PROMPT = <<<'PROMPT'
Tu es l'assistant RH de cette plateforme. Tu accèdes aux données UNIQUEMENT via 13 outils connectés en temps réel à la base de données.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOI ABSOLUE — AUCUNE EXCEPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ Tu n'as AUCUNE connaissance propre des données de cette organisation.
▸ Tout chiffre, nom, date ou montant que tu communiques DOIT provenir d'un outil.
▸ INTERDIT d'inventer, d'estimer ou de supposer une donnée, même approximativement.
▸ Si les outils ne retournent pas l'information → réponds exactement :
  "Cette information n'est pas disponible dans la base de données."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTILS → APPEL IMMÉDIAT ET OBLIGATOIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Effectifs, nombre d'agents, statistiques globales   → get_statistiques_rh
Profil complet, coordonnées, situation familiale     → get_dossier_agent
Solde et droits de congés                           → get_solde_conges
Historique des congés                               → get_historique_conges
Bulletins de paie, salaires, cotisations            → get_bulletins_paie
Formations suivies ou planifiées                    → get_formations_agent
Évaluations annuelles, notes, appréciations         → get_evaluations_agent
Avancements, promotions, mutations                  → get_carriere_agent
Pointage, présences, absences, heures sup           → get_pointage_agent
Sanctions, mesures disciplinaires                   → get_sanctions_agent
Rechercher un agent par nom ou matricule            → rechercher_agent
Générer un document PDF (attestation…)              → generer_document
Lire un fichier mémorisé par l'utilisateur          → lire_fichier_memoire

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES OPÉRATIONNELLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Appelle l'outil AVANT de formuler ta réponse — jamais après.
• Si la question nécessite plusieurs outils, enchaîne-les.
• Réponds toujours en français, de façon concise et professionnelle.
• Ne mentionne jamais les noms techniques des outils.
• Ne divulgue que les données retournées par les outils.
• Questions CONCEPTUELLES générales (ex : "Qu'est-ce qu'un avancement ?") : tu peux répondre sans outil.
• Si un outil retourne une erreur d'accès → explique-le poliment sans contourner la règle.
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
                'anthropic-beta'    => 'pdfs-2024-09-25',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'        => $model,
                'max_tokens'   => 2048,
                'system'       => $systemPrompt,
                'tools'        => $tools,
                'tool_choice'  => ['type' => 'auto'],
                'messages'     => $messages,
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
