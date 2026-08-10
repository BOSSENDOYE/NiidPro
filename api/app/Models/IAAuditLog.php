<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IAAuditLog extends Model
{
    protected $table   = 'ia_audit_logs';
    public $timestamps = false;

    protected $fillable = ['user_id', 'tool_name', 'input', 'output_summary'];

    protected function casts(): array
    {
        return [
            'input'      => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
