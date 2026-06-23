<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationBesoin extends Model
{
    protected $table = 'formation_besoins';

    protected $fillable = [
        'action_id', 'intitule_libre', 'direction_id', 'employee_id',
        'annee', 'source', 'commentaire', 'statut', 'created_by',
    ];

    public function action()
    {
        return $this->belongsTo(FormationAction::class, 'action_id');
    }

    public function direction()
    {
        return $this->belongsTo(Department::class, 'direction_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
