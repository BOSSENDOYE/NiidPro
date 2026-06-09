<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecruitmentAugmentation extends Model
{
    protected $table = 'recruitment_augmentations';

    protected $fillable = [
        'libelle', 'type', 'taux', 'unite', 'date_effet', 'description', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'taux'        => 'decimal:2',
        'date_effet'  => 'date',
    ];
}
