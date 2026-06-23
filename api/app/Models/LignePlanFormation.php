<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LignePlanFormation extends Model
{
    protected $table = 'lignes_plan_formation';

    protected $fillable = [
        'plan_formation_id', 'action_id', 'besoin_id', 'direction_id',
        'nb_participants_prevu', 'dates_previsionnelles', 'cout_unitaire',
        'cout_total', 'source_financement', 'caractere', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'cout_unitaire'        => 'decimal:2',
            'cout_total'           => 'decimal:2',
            'nb_participants_prevu'=> 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::saving(function (LignePlanFormation $ligne) {
            if (!is_null($ligne->cout_unitaire) && !is_null($ligne->nb_participants_prevu)) {
                $ligne->cout_total = round((float) $ligne->cout_unitaire * $ligne->nb_participants_prevu, 2);
            }
        });
    }

    public function plan()
    {
        return $this->belongsTo(PlanFormation::class, 'plan_formation_id');
    }

    public function action()
    {
        return $this->belongsTo(FormationAction::class, 'action_id');
    }

    public function besoin()
    {
        return $this->belongsTo(FormationBesoin::class, 'besoin_id');
    }

    public function direction()
    {
        return $this->belongsTo(Department::class, 'direction_id');
    }

    public function sessions()
    {
        return $this->hasMany(FormationSession::class, 'ligne_plan_id');
    }
}
