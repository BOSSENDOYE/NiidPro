<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    protected $fillable = [
        'employee_id', 'year', 'month', 'base_salary', 'overtime_pay', 'bonuses',
        'allowances', 'deductions', 'employee_contributions', 'employer_contributions',
        'net_salary', 'gross_salary', 'document_path', 'status', 'paid_at', 'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'paid_at'               => 'datetime',
            'base_salary'           => 'decimal:2',
            'overtime_pay'          => 'decimal:2',
            'bonuses'               => 'decimal:2',
            'allowances'            => 'decimal:2',
            'deductions'            => 'decimal:2',
            'employee_contributions'=> 'decimal:2',
            'employer_contributions'=> 'decimal:2',
            'net_salary'            => 'decimal:2',
            'gross_salary'          => 'decimal:2',
        ];
    }

    public function employee()   { return $this->belongsTo(Employee::class); }
    public function generator()  { return $this->belongsTo(User::class, 'generated_by'); }
}
