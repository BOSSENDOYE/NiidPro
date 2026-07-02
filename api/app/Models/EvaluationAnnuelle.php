<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EvaluationAnnuelle extends Model
{
    protected $table = 'evaluations_annuelles';

    protected $fillable = [
        'employee_id', 'evaluateur_id', 'annee', 'statut',
        'note_resultats', 'note_competences', 'note_comportement', 'note_developpement',
        'note_globale', 'appreciation',
        'objectifs_annee', 'commentaire_evaluateur', 'commentaire_agent',
        'date_entretien', 'date_validation',
    ];

    protected $casts = [
        'note_resultats'     => 'float',
        'note_competences'   => 'float',
        'note_comportement'  => 'float',
        'note_developpement' => 'float',
        'note_globale'       => 'float',
        'date_entretien'     => 'date',
        'date_validation'    => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function evaluateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluateur_id');
    }

    public function pdi(): HasOne
    {
        return $this->hasOne(PlanDeveloppementIndividuel::class, 'evaluation_annuelle_id');
    }

    /** Calcule et enregistre note_globale + appreciation avant sauvegarde. */
    protected static function booted(): void
    {
        static::saving(function (self $eval) {
            $notes = array_filter([
                $eval->note_resultats,
                $eval->note_competences,
                $eval->note_comportement,
                $eval->note_developpement,
            ], fn ($n) => $n !== null);

            if (count($notes) === 4) {
                $avg = round(array_sum($notes) / 4, 2);
                $eval->note_globale = $avg;
                $eval->appreciation = match (true) {
                    $avg >= 3.5 => 'excellent',
                    $avg >= 2.5 => 'satisfaisant',
                    $avg >= 1.5 => 'passable',
                    default     => 'insuffisant',
                };
            }
        });
    }
}
