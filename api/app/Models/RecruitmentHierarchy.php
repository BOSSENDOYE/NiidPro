<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecruitmentHierarchy extends Model
{
    protected $table = 'recruitment_hierarchies';

    protected $fillable = ['code', 'libelle', 'description', 'ordre', 'is_active'];

    protected $casts = ['is_active' => 'boolean', 'ordre' => 'integer'];

    public function baremes(): HasMany
    {
        return $this->hasMany(RecruitmentBareme::class, 'hierarchy_id');
    }
}
