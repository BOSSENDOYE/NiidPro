<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SentEmail extends Model
{
    protected $fillable = [
        'to_email', 'to_name', 'subject', 'body',
        'employee_id', 'sent_by', 'status', 'error',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
