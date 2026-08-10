<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IAMessage extends Model
{
    protected $table    = 'ia_messages';
    protected $fillable = ['ia_conversation_id', 'role', 'content'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(IAConversation::class, 'ia_conversation_id');
    }
}
