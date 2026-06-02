<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GeneratedDocument extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'template_id', 'employee_id', 'employees_data', 'type',
        'reference', 'content_final', 'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'employees_data' => 'array',
        ];
    }

    public function template()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
