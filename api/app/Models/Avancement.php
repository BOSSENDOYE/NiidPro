<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Avancement extends Model
{
    protected $fillable = [
        'employee_id', 'categorie', 'echelon_avant', 'echelon_apres',
        'note_evaluation', 'evaluation_annuelle_id',
        'date_eligibilite', 'date_decision', 'decision', 'motif_refus',
        'initie_par_id', 'valide_par_daf_id', 'decide_par_dg_id',
        'notifie_le', 'statut',
    ];

    protected $casts = [
        'date_eligibilite' => 'date',
        'date_decision'    => 'date',
        'notifie_le'       => 'date',
        'note_evaluation'  => 'float',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function evaluationAnnuelle(): BelongsTo
    {
        return $this->belongsTo(EvaluationAnnuelle::class, 'evaluation_annuelle_id');
    }

    public function initiePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initie_par_id');
    }

    public function valideDaf(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par_daf_id');
    }

    public function decideDg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decide_par_dg_id');
    }
}
