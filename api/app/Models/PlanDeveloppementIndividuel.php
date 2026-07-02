<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanDeveloppementIndividuel extends Model
{
    protected $table = 'plans_developpement_individuel';

    protected $fillable = [
        'employee_id', 'evaluation_annuelle_id', 'annee',
        'objectifs_professionnels', 'competences_a_renforcer',
        'commentaire_rh', 'commentaire_agent',
        'valide_par_rh_id', 'date_validation', 'statut',
    ];

    protected $casts = [
        'date_validation' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function evaluationAnnuelle(): BelongsTo
    {
        return $this->belongsTo(EvaluationAnnuelle::class, 'evaluation_annuelle_id');
    }

    public function valideParRh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par_rh_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(PdiAction::class, 'pdi_id');
    }
}
