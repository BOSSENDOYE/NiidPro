<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationEvaluation extends Model
{
    protected $table = 'formation_evaluations';

    protected $fillable = [
        'inscription_id', 'type', 'score', 'commentaire',
        'evalue_par_user_id', 'date_evaluation',
    ];

    protected function casts(): array
    {
        return [
            'score'           => 'decimal:2',
            'date_evaluation' => 'date',
        ];
    }

    public function inscription()
    {
        return $this->belongsTo(FormationInscription::class, 'inscription_id');
    }

    public function evaluePar()
    {
        return $this->belongsTo(User::class, 'evalue_par_user_id');
    }
}
