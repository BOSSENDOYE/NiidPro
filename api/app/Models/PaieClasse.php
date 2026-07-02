<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaieClasse extends Model
{
    protected $table = 'paie_classes';

    protected $fillable = ['hierarchy_id', 'code', 'libelle', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function hierarchy(): BelongsTo
    {
        return $this->belongsTo(RecruitmentHierarchy::class, 'hierarchy_id');
    }

    public function echelons(): HasMany
    {
        return $this->hasMany(PaieEchelon::class, 'class_id');
    }
}
