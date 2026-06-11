<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JourFerie extends Model
{
    protected $table = 'jours_feries';

    protected $fillable = ['libelle', 'is_recurring', 'mois', 'jour', 'date', 'annee'];

    protected function casts(): array
    {
        return [
            'is_recurring' => 'boolean',
            'date'         => 'date',
        ];
    }
}
