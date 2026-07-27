<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkflowConfig;
use Illuminate\Http\Request;

class WorkflowConfigController extends Controller
{
    /** Liste tous les workflows groupés. */
    public function index()
    {
        $grouped = WorkflowConfig::orderBy('workflow_key')
            ->orderBy('level')
            ->get()
            ->groupBy('workflow_key')
            ->map(fn ($items, $key) => [
                'key'    => $key,
                'label'  => $items->first()->workflow_label,
                'levels' => $items->values(),
            ])
            ->values();

        return response()->json($grouped);
    }

    /** Sauvegarde en masse (upsert complet). */
    public function update(Request $request)
    {
        $rows = $request->validate([
            '*.workflow_key'   => ['required', 'string', 'max:50'],
            '*.workflow_label' => ['required', 'string', 'max:150'],
            '*.level'          => ['required', 'integer', 'min:1', 'max:5'],
            '*.label'          => ['required', 'string', 'max:150'],
            '*.role_name'      => ['required', 'string', 'max:100'],
            '*.is_active'      => ['boolean'],
        ]);

        foreach ($rows as $row) {
            WorkflowConfig::updateOrCreate(
                ['workflow_key' => $row['workflow_key'], 'level' => $row['level']],
                [
                    'workflow_label' => $row['workflow_label'],
                    'label'          => $row['label'],
                    'role_name'      => $row['role_name'],
                    'is_active'      => $row['is_active'] ?? true,
                ]
            );
        }

        return response()->json(['message' => 'Configuration sauvegardée.']);
    }

    /** Supprime un workflow entier. */
    public function destroy(string $key)
    {
        $systemKeys = ['absence', 'conge', 'conge_special', 'mission'];
        if (in_array($key, $systemKeys)) {
            return response()->json(['message' => 'Ce workflow système ne peut pas être supprimé.'], 422);
        }
        WorkflowConfig::where('workflow_key', $key)->delete();
        return response()->json(null, 204);
    }
}
