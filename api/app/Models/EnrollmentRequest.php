<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnrollmentRequest extends Model
{
    protected $fillable = [
        'matricule', 'first_name', 'last_name', 'date_naissance',
        'lieu_naissance', 'date_embauche', 'fonction', 'telephone', 'email',
        'categorie_emploi', 'qualification',
        'status', 'rejection_reason', 'matched_employee_id', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'date_naissance' => 'date',
            'date_embauche'  => 'date',
            'reviewed_at'    => 'datetime',
        ];
    }

    public function matchedEmployee()
    {
        return $this->belongsTo(Employee::class, 'matched_employee_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
