<?php

namespace App\Services\IA\Tools;

use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InterrogerTableTool implements IATool
{
    private const BLOCKED_TABLES = [
        'users', 'personal_access_tokens', 'password_reset_tokens',
        'migrations', 'jobs', 'failed_jobs', 'cache', 'sessions',
        'ia_audit_logs', 'ia_messages', 'ia_conversations', 'ia_files',
        'assistant_configs',
    ];

    private const BLOCKED_COLS = [
        'password', 'remember_token', 'api_key', 'token', 'secret', 'two_factor_secret',
    ];

    private const ALLOWED_OPS = ['=', '!=', '>', '<', '>=', '<=', 'like'];

    public function name(): string { return 'interroger_table'; }

    public function description(): string
    {
        return 'Interroge directement n\'importe quelle table de la base de données avec des filtres, '
             . 'un tri et une limite. Utilise cet outil pour toute question sur des données '
             . 'qui ne sont pas couvertes par les autres outils spécialisés. '
             . 'Appelle explorer_schema_db d\'abord si tu ne connais pas le nom exact des colonnes.';
    }

    public function inputSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'table'    => [
                    'type'        => 'string',
                    'description' => 'Nom exact de la table à interroger.',
                ],
                'columns'  => [
                    'type'        => 'array',
                    'items'       => ['type' => 'string'],
                    'description' => 'Colonnes à retourner. Vide = toutes les colonnes accessibles.',
                ],
                'conditions' => [
                    'type'  => 'array',
                    'items' => [
                        'type'       => 'object',
                        'properties' => [
                            'column'   => ['type' => 'string'],
                            'operator' => ['type' => 'string', 'description' => '=, !=, >, <, >=, <=, like'],
                            'value'    => ['description' => 'Valeur du filtre'],
                        ],
                        'required' => ['column', 'value'],
                    ],
                    'description' => 'Filtres WHERE. Pour LIKE utiliser %valeur%.',
                ],
                'order_by'  => ['type' => 'string', 'description' => 'Colonne pour le tri.'],
                'order_dir' => ['type' => 'string', 'description' => 'asc ou desc (défaut: asc).'],
                'limit'     => ['type' => 'integer', 'description' => 'Nombre max de résultats (défaut: 50, max: 100).'],
            ],
            'required' => ['table'],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $tableName = trim($input['table'] ?? '');

        if (in_array($tableName, self::BLOCKED_TABLES)) {
            return ['erreur' => "Table '{$tableName}' non accessible pour des raisons de sécurité."];
        }

        if (! Schema::hasTable($tableName)) {
            return [
                'erreur' => "Table '{$tableName}' introuvable. Appelez explorer_schema_db pour voir la liste des tables disponibles.",
            ];
        }

        $validCols = Schema::getColumnListing($tableName);

        // Colonnes à sélectionner
        $requested = array_filter(
            $input['columns'] ?? $validCols,
            fn($c) => in_array($c, $validCols) && ! in_array($c, self::BLOCKED_COLS)
        );
        $select = array_values($requested) ?: array_values(array_diff($validCols, self::BLOCKED_COLS));

        $query = DB::table($tableName)->select($select);

        // Scope par rôle
        if (! $user->hasAnyRole(['super_admin', 'admin_rh'])) {
            if ($user->hasRole('manager') && in_array('department_id', $validCols)) {
                $query->where('department_id', $user->employee?->department_id);
            } elseif (! $user->hasRole('manager')) {
                if (in_array('employee_id', $validCols)) {
                    $query->where('employee_id', $user->employee?->id);
                } elseif (in_array('user_id', $validCols)) {
                    $query->where('user_id', $user->id);
                }
            }
        }

        // Conditions WHERE
        foreach ($input['conditions'] ?? [] as $cond) {
            $col = $cond['column'] ?? null;
            if (! $col || ! in_array($col, $validCols) || in_array($col, self::BLOCKED_COLS)) {
                continue;
            }
            $op  = in_array($cond['operator'] ?? '=', self::ALLOWED_OPS) ? $cond['operator'] : '=';
            $val = $cond['value'];
            $query->where($col, $op, $val);
        }

        // Tri
        if (! empty($input['order_by']) && in_array($input['order_by'], $validCols)) {
            $dir = strtolower($input['order_dir'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
            $query->orderBy($input['order_by'], $dir);
        }

        $limit  = min((int) ($input['limit'] ?? 50), 100);
        $total  = (clone $query)->count();
        $rows   = $query->limit($limit)->get()->toArray();

        return [
            'table'    => $tableName,
            'total'    => $total,
            'retournes' => count($rows),
            'rows'     => $rows,
        ];
    }
}
