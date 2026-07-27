<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AssistantConfig extends Model
{
    protected $fillable = [
        'provider', 'api_key', 'model',
        'system_prompt', 'max_tokens', 'temperature', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'max_tokens'  => 'integer',
        'temperature' => 'float',
    ];

    // La clé API est toujours masquée dans les réponses JSON
    protected $hidden = ['api_key'];

    // ── Singleton : toujours une seule config ─────────────────────────────────
    public static function get(): self
    {
        return static::firstOrCreate([], [
            'provider'      => 'claude',
            'model'         => 'claude-haiku-4-5-20251001',
            'system_prompt' => "Tu es l'assistant RH de l'ANASER (Agence Nationale de Sécurité Routière du Sénégal). Tu aides les responsables RH à analyser les données, répondre aux questions sur les congés, absences, effectifs, formations, recrutements et la paie. Réponds toujours en français, de manière professionnelle et concise.",
            'max_tokens'    => 1024,
            'temperature'   => 0.7,
            'is_active'     => false,
        ]);
    }

    public function setApiKeyAttribute(?string $value): void
    {
        $this->attributes['api_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getDecryptedApiKey(): ?string
    {
        if (! $this->attributes['api_key']) return null;
        try {
            return Crypt::decryptString($this->attributes['api_key']);
        } catch (\Throwable) {
            return null;
        }
    }

    public function hasApiKey(): bool
    {
        return ! empty($this->attributes['api_key']);
    }
}
