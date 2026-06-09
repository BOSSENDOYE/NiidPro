<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingProvider extends Model
{
    protected $fillable = [
        'name', 'contact_person', 'email', 'phone',
        'address', 'city', 'country'
    ];

    public function trainings()
    {
        return $this->hasMany(Training::class, 'provider_id');
    }
}
