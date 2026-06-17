<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CandidaturePlan extends Model
{
    protected $table = 'candidatures_plan';

    protected $fillable = [
        'processus_id',
        'nom',
        'prenom',
        'email',
        'telephone',
        'cv_path',
        'lettre_path',
        'statut',
        'score',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'score'  => 'decimal:2',
            'statut' => 'string',
        ];
    }

    // Relations
    public function processus()
    {
        return $this->belongsTo(ProcessusRecrutement::class, 'processus_id');
    }

    public function decisions()
    {
        return $this->hasMany(DecisionRecrutement::class, 'candidature_id');
    }
}
