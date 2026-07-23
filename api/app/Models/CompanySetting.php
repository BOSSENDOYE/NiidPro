<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $fillable = [
        'name', 'legal_name', 'logo_path', 'stamp_path', 'email', 'phone', 'website',
        'address', 'city', 'country', 'latitude', 'longitude', 'pointage_radius',
        'rccm', 'ninea', 'primary_color', 'description',
    ];

    /** Renvoie l'unique ligne de paramètres (la crée si absente). */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], ['name' => 'Mon Entreprise']);
    }
}
