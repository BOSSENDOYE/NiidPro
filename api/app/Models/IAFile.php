<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IAFile extends Model
{
    protected $table    = 'ia_files';
    protected $fillable = [
        'user_id', 'conversation_id', 'filename', 'path',
        'media_type', 'content', 'size_kb', 'is_persistent',
    ];

    protected $casts = ['is_persistent' => 'boolean'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(IAConversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function typeLabel(): string
    {
        if (str_starts_with($this->media_type, 'image/')) return 'image';
        if ($this->media_type === 'application/pdf')       return 'pdf';
        if (str_contains($this->media_type, 'text') || $this->media_type === 'application/json') return 'texte';
        return 'document';
    }
}
