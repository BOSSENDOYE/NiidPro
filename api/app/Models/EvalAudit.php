<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalAudit extends Model
{
    protected $table    = 'eval_audit';
    public    $timestamps = false;

    protected $fillable = ['user_id', 'action', 'entite_type', 'entite_id', 'meta'];

    protected $casts = ['meta' => 'array', 'created_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
