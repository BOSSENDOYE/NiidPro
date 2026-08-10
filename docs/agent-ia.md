# Agent IA — NiidPro

## Architecture

```
POST /api/ia/chat  (auth:sanctum, throttle:20,1)
      │
      ▼
AgentIAController::chat()
  ├── Récupère ou crée IAConversation (1 par user)
  ├── Charge les 20 derniers IAMessage comme contexte
  └── ClaudeAgentService::run(messages, user)
        │
        ├── Appelle https://api.anthropic.com/v1/messages
        │     avec `tools` = ToolRegistry::schemaForClaude()
        │
        ├── Si stop_reason == "tool_use"
        │     └── ToolRegistry::run(name, input, user)
        │           ├── Exécute l'outil (Eloquent, scopé par rôle)
        │           └── Écrit dans ia_audit_logs
        │
        └── Renvoie le texte final (max 5 itérations)
```

## Ajouter un nouvel outil

### 1. Créer la classe

```php
// app/Services/IA/Tools/ListerContratsTool.php

namespace App\Services\IA\Tools;

use App\Models\Contract;
use App\Models\User;
use App\Services\IA\Tools\Contracts\IATool;

class ListerContratsTool implements IATool
{
    public function name(): string { return 'lister_contrats_expirant'; }

    public function description(): string
    {
        return 'Liste les contrats qui expirent dans les N prochains jours. '
             . 'Utilise cet outil quand l\'utilisateur demande les contrats bientôt expirés.';
    }

    public function inputSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'jours' => [
                    'type'        => 'integer',
                    'description' => 'Nombre de jours à l\'horizon (défaut : 30).',
                ],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        // Règle de sécurité : seuls les admins voient tous les contrats
        if (! $user->hasAnyRole(['super_admin', 'admin_rh'])) {
            return ['error' => 'Accès réservé aux administrateurs RH.'];
        }

        $jours    = max(1, min(365, (int) ($input['jours'] ?? 30)));
        $deadline = now()->addDays($jours);

        $contrats = Contract::with('employee')
            ->where('is_active', true)
            ->whereNotNull('end_date')
            ->where('end_date', '<=', $deadline)
            ->orderBy('end_date')
            ->limit(20)
            ->get();

        return [
            'contrats' => $contrats->map(fn($c) => [
                'matricule'   => $c->employee->employee_number,
                'nom_complet' => $c->employee->full_name,
                'type'        => $c->type,
                'fin'         => $c->end_date?->format('d/m/Y'),
                'jours_restants' => (int) now()->diffInDays($c->end_date, false),
            ])->toArray(),
            'total' => $contrats->count(),
        ];
    }
}
```

### 2. Enregistrer l'outil

Dans [IAServiceProvider.php](../api/app/Providers/IAServiceProvider.php) :

```php
use App\Services\IA\Tools\ListerContratsTool;

$registry->register(new ListerContratsTool());
```

C'est tout. Le `ToolRegistry` expose automatiquement le nouveau schéma à Claude.

## Règles de sécurité à respecter

| Règle | Comment l'appliquer |
|---|---|
| Pas d'accès à toute une table | Toujours filtrer par `department_id` ou `employee_id` selon le rôle |
| Vérifier les droits avant la requête | `if (!$user->hasAnyRole([...])) return ['error' => '...']` |
| Pas de SQL libre | Utiliser Eloquent uniquement, jamais `DB::select()` avec un input de l'IA |
| Journalisation automatique | Le `ToolRegistry::run()` crée la ligne `ia_audit_logs` — ne pas la contourner |

## Tables créées

| Table | Description |
|---|---|
| `ia_conversations` | Une conversation par utilisateur (clé `user_id` unique) |
| `ia_messages` | Historique de chaque échange (role user/assistant + content) |
| `ia_audit_logs` | Trace de chaque appel d'outil (user, tool, input, résumé sortie) |

## Commandes de déploiement

```bash
php artisan migrate
php artisan config:clear
php artisan cache:clear
```
