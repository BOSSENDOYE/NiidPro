<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BesoinRecrutement extends Model
{
    protected $table = 'besoins_recrutement';

    protected $fillable = [
        'poste_id',
        'direction_id',
        'motif',
        'date_constat',
        'description',
        'statut',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_constat' => 'date',
            'statut'       => 'string',
            'motif'        => 'string',
        ];
    }

    // Relations
    public function poste()
    {
        return $this->belongsTo(PlanPoste::class, 'poste_id');
    }

    public function direction()
    {
        return $this->belongsTo(Department::class, 'direction_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lignesPlan()
    {
        return $this->hasMany(LignePlan::class, 'besoin_id');
    }
}
