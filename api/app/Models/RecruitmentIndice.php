<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecruitmentIndice extends Model
{
    protected $table = 'recruitment_indices';

    protected $fillable = [
        'code', 'hierarchy_id', 'classe', 'echelon_label',
        'valeur_point', 'valeur', 'solde_mensuelle', 'garde',
        'description', 'is_active',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'valeur'          => 'integer',
        'valeur_point'    => 'float',
        'solde_mensuelle' => 'float',
    ];

    public function hierarchy(): BelongsTo
    {
        return $this->belongsTo(RecruitmentHierarchy::class, 'hierarchy_id');
    }

    public function augmentations(): BelongsToMany
    {
        return $this->belongsToMany(
            RecruitmentAugmentation::class,
            'recruitment_indice_augmentation',
            'indice_id',
            'augmentation_id'
        );
    }

    public function baremes(): HasMany
    {
        return $this->hasMany(RecruitmentBareme::class, 'indice_id');
    }
}
