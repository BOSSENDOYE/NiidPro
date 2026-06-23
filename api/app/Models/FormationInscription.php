<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationInscription extends Model
{
    protected $table = 'formation_inscriptions';

    protected $fillable = [
        'session_id', 'employee_id', 'statut',
        'attestation_path', 'date_attestation', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_attestation' => 'date',
        ];
    }

    public function session()
    {
        return $this->belongsTo(FormationSession::class, 'session_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function evaluations()
    {
        return $this->hasMany(FormationEvaluation::class, 'inscription_id');
    }
}
