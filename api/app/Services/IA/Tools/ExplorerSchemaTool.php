<?php

namespace App\Services\IA\Tools;

use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class ExplorerSchemaTool implements IATool
{
    // Tables jamais exposées au modèle IA
    private const BLOCKED = [
        'users', 'personal_access_tokens', 'password_reset_tokens',
        'migrations', 'jobs', 'failed_jobs', 'cache', 'sessions',
        'ia_audit_logs', 'ia_messages', 'ia_conversations', 'ia_files',
        'assistant_configs',
    ];

    // Colonnes jamais retournées
    private const BLOCKED_COLS = [
        'password', 'remember_token', 'api_key', 'token', 'secret', 'two_factor_secret',
    ];

    public function name(): string { return 'explorer_schema_db'; }

    public function description(): string
    {
        return 'Retourne la liste de toutes les tables de la base de données avec leurs colonnes. '
             . 'À appeler en premier quand tu ne sais pas quelle table contient une information, '
             . 'ou pour comprendre la structure des données disponibles.';
    }

    public function inputSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'table' => [
                    'type'        => 'string',
                    'description' => 'Optionnel : si fourni, retourne uniquement le détail de cette table.',
                ],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $allTables = Schema::getTableListing();

        // Filtre par table spécifique si demandée
        if (! empty($input['table'])) {
            $t = $input['table'];
            if (in_array($t, self::BLOCKED) || ! Schema::hasTable($t)) {
                return ['erreur' => "Table '{$t}' non accessible ou inexistante."];
            }
            return [
                'table'   => $t,
                'colonnes' => $this->columns($t),
            ];
        }

        $schema = [];
        foreach ($allTables as $table) {
            if (in_array($table, self::BLOCKED)) continue;
            $schema[] = [
                'table'    => $table,
                'colonnes' => $this->columns($table),
            ];
        }

        return [
            'tables' => $schema,
            'total'  => count($schema),
        ];
    }

    private function columns(string $table): array
    {
        $cols = Schema::getColumnListing($table);
        return array_values(array_filter($cols, fn($c) => ! in_array($c, self::BLOCKED_COLS)));
    }
}
