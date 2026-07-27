<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class LeaveSettings extends Model
{
    protected $table = 'leave_settings';

    protected $fillable = [
        'annual_quota',
        'min_jours_obligatoires',
        'report_annees_max',
        'samedi_ouvrable',
        'mere_famille_age_max',
        'mere_famille_jours_enfant',
    ];

    protected function casts(): array
    {
        return [
            'samedi_ouvrable' => 'boolean',
        ];
    }

    /** Retourne les paramètres (crée la ligne par défaut si absente). */
    public static function get(): self
    {
        return static::firstOrCreate([], [
            'annual_quota'             => 24,
            'min_jours_obligatoires'   => 6,
            'report_annees_max'        => 2,
            'samedi_ouvrable'          => true,
            'mere_famille_age_max'     => 14,
            'mere_famille_jours_enfant'=> 1,
        ]);
    }
}
