<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LignePlan extends Model
{
    protected $table = 'lignes_plan';

    protected $fillable = [
        'plan_recrutement_id',
        'besoin_id',
        'classification_ccni',
        'type_contrat',
        'duree_cdd',
        'salaire_base_estime',
        'cout_estime',
        'urgence_operationnelle',
        'impact_reglementaire',
        'disponibilite_budgetaire',
        'profil_marche_disponible',
        'priorite_score',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'duree_cdd'                 => 'integer',
            'salaire_base_estime'       => 'decimal:2',
            'cout_estime'               => 'decimal:2',
            'urgence_operationnelle'    => 'integer',
            'impact_reglementaire'      => 'integer',
            'disponibilite_budgetaire'  => 'integer',
            'profil_marche_disponible'  => 'integer',
            'priorite_score'            => 'decimal:2',
            'classification_ccni'       => 'string',
            'type_contrat'              => 'string',
        ];
    }

    /**
     * Boot: auto-calculate priorite_score and cout_estime before saving.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (LignePlan $ligne) {
            $ligne->priorite_score = $ligne->calculatePrioriteScore();

            if (is_null($ligne->cout_estime) && !is_null($ligne->salaire_base_estime)) {
                $duree = $ligne->duree_cdd ?? 12;
                $ligne->cout_estime = round((float) $ligne->salaire_base_estime * 1.28 * $duree, 2);
            }
        });
    }

    /**
     * Calculate priorite_score: (urgence*3 + impact*3 + budget*2 + marche*2) / 40 * 100
     */
    public function calculatePrioriteScore(): float
    {
        $urgence = $this->urgence_operationnelle   ?? 3;
        $impact  = $this->impact_reglementaire      ?? 3;
        $budget  = $this->disponibilite_budgetaire  ?? 3;
        $marche  = $this->profil_marche_disponible  ?? 3;

        return round(($urgence * 3 + $impact * 3 + $budget * 2 + $marche * 2) / 40 * 100, 2);
    }

    /**
     * Accessor: if cout_estime is null, compute on the fly.
     */
    public function getCoutEstimeAttribute($value): ?float
    {
        if (!is_null($value)) {
            return (float) $value;
        }

        if (!is_null($this->salaire_base_estime)) {
            $duree = $this->duree_cdd ?? 12;
            return round((float) $this->salaire_base_estime * 1.28 * $duree, 2);
        }

        return null;
    }

    // Relations
    public function planRecrutement()
    {
        return $this->belongsTo(PlanRecrutement::class, 'plan_recrutement_id');
    }

    public function besoin()
    {
        return $this->belongsTo(BesoinRecrutement::class, 'besoin_id');
    }

    public function processus()
    {
        return $this->hasMany(ProcessusRecrutement::class, 'ligne_plan_id');
    }
}
