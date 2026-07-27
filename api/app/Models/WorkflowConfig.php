<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowConfig extends Model
{
    protected $fillable = [
        'workflow_key', 'workflow_label', 'level', 'label', 'role_name', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** Retourne les niveaux actifs d'un workflow, triés par level. */
    public static function activeFor(string $key): \Illuminate\Database\Eloquent\Collection
    {
        return static::where('workflow_key', $key)
            ->where('is_active', true)
            ->orderBy('level')
            ->get();
    }
}
