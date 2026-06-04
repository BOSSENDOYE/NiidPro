<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContractArchive extends Model
{
    protected $fillable = [
        'employee_id', 'original_name', 'file_path',
        'file_size', 'mime_type', 'label', 'uploaded_by',
    ];

    public function employee()  { return $this->belongsTo(Employee::class); }
    public function uploader()  { return $this->belongsTo(User::class, 'uploaded_by'); }
}
