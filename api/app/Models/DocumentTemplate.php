<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentTemplate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'type', 'name', 'content', 'status', 'description', 'settings', 'created_by',
    ];

    protected function casts(): array
    {
        return ['settings' => 'array'];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function generatedDocuments()
    {
        return $this->hasMany(GeneratedDocument::class, 'template_id');
    }
}
