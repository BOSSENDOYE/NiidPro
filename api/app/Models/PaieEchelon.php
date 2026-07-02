<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaieEchelon extends Model
{
    protected $table = 'paie_echelons';

    protected $fillable = ['class_id', 'numero', 'libelle', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean', 'numero' => 'integer'];

    public function classe(): BelongsTo
    {
        return $this->belongsTo(PaieClasse::class, 'class_id');
    }
}
