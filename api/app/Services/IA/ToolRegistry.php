<?php

namespace App\Services\IA;

use App\Models\IAAuditLog;
use App\Models\User;
use App\Services\IA\Tools\Contracts\IATool;

class ToolRegistry
{
    /** @var array<string, IATool> */
    private array $tools = [];

    public function register(IATool $tool): void
    {
        $this->tools[$tool->name()] = $tool;
    }

    /**
     * Retourne la liste de tools au format attendu par le paramètre `tools` de l'API Claude.
     */
    public function schemaForClaude(): array
    {
        return array_values(array_map(fn(IATool $t) => [
            'name'         => $t->name(),
            'description'  => $t->description(),
            'input_schema' => $t->inputSchema(),
        ], $this->tools));
    }

    /**
     * Exécute un outil par son nom, journalise l'appel dans ia_audit_logs et retourne le résultat.
     */
    public function run(string $name, array $input, User $user): array
    {
        if (! isset($this->tools[$name])) {
            return ['error' => "Outil inconnu : {$name}"];
        }

        $result = $this->tools[$name]->execute($input, $user);

        IAAuditLog::create([
            'user_id'        => $user->id,
            'tool_name'      => $name,
            'input'          => $input,
            'output_summary' => mb_substr(json_encode($result, JSON_UNESCAPED_UNICODE), 0, 500),
        ]);

        return $result;
    }
}
