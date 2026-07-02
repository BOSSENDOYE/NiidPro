<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Promotion extends Model
{
    protected $fillable = [
        'employee_id', 'categorie_avant', 'categorie_apres', 'type_promotion',
        'annees_dans_categorie', 'note_eval_n1', 'note_eval_n2',
        'dossier_candidature_path',
        'commission_date', 'commission_avis', 'commission_pv_path',
        'decide_par_dg_id', 'date_decision', 'date_effet',
        'commentaire', 'statut',
    ];

    protected $casts = [
        'commission_date' => 'date',
        'date_decision'   => 'date',
        'date_effet'      => 'date',
        'note_eval_n1'    => 'float',
        'note_eval_n2'    => 'float',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function decideDg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decide_par_dg_id');
    }
}
