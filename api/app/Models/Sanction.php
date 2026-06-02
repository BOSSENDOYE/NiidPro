<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Sanction extends Model
{
    protected $fillable = [
        'employee_id', 'type', 'reason', 'sanction_date',
        'start_date', 'end_date', 'duration_days',
        'decided_by', 'reference', 'status', 'notes', 'document_path',
    ];

    protected $appends = ['file_url'];

    protected function casts(): array
    {
        return [
            'sanction_date' => 'date:Y-m-d',
            'start_date'    => 'date:Y-m-d',
            'end_date'      => 'date:Y-m-d',
        ];
    }

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->document_path) return null;
        return Storage::disk('public')->url($this->document_path);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
