<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Justification extends Model
{
    protected $fillable = [
        'employee_id', 'attendance_id', 'absence_date', 'absence_type', 'reason', 'document_path',
        'status', 'reviewed_by', 'reviewed_at', 'review_notes',
    ];

    protected $appends = ['date', 'file_url', 'comment'];

    protected function casts(): array
    {
        return [
            'absence_date' => 'date:Y-m-d',
            'reviewed_at'  => 'datetime',
        ];
    }

    public function getDateAttribute(): ?string
    {
        return $this->absence_date?->toDateString();
    }

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->document_path) return null;
        return Storage::disk('public')->url($this->document_path);
    }

    public function getCommentAttribute(): ?string
    {
        return $this->review_notes;
    }

    public function employee()   { return $this->belongsTo(Employee::class); }
    public function attendance() { return $this->belongsTo(Attendance::class); }
    public function reviewer()   { return $this->belongsTo(User::class, 'reviewed_by'); }
}
