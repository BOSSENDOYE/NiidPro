<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecruitmentBareme extends Model
{
    protected $table = 'recruitment_baremes';

    protected $fillable = [
        'hierarchy_id', 'indice_id', 'echelon', 'salaire_base', 'date_application', 'is_active',
        'revenu_brut', 'trimf_pers',
        'part_1', 'part_1_5', 'part_2', 'part_2_5', 'part_3',
        'part_3_5', 'part_4', 'part_4_5', 'part_5', 'id_bareme',
    ];

    protected $casts = [
        'is_active'        => 'boolean',
        'echelon'          => 'integer',
        'salaire_base'     => 'decimal:2',
        'revenu_brut'      => 'decimal:2',
        'trimf_pers'       => 'decimal:2',
        'part_1'           => 'decimal:2',
        'part_1_5'         => 'decimal:2',
        'part_2'           => 'decimal:2',
        'part_2_5'         => 'decimal:2',
        'part_3'           => 'decimal:2',
        'part_3_5'         => 'decimal:2',
        'part_4'           => 'decimal:2',
        'part_4_5'         => 'decimal:2',
        'part_5'           => 'decimal:2',
        'date_application' => 'date',
    ];

    public function hierarchy(): BelongsTo
    {
        return $this->belongsTo(RecruitmentHierarchy::class, 'hierarchy_id');
    }

    public function indice(): BelongsTo
    {
        return $this->belongsTo(RecruitmentIndice::class, 'indice_id');
    }
}
