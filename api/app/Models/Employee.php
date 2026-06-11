<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Employee extends Model
{
    use SoftDeletes;

    protected $appends = ['photo_url', 'full_name'];

    protected $fillable = [
        'employee_number', 'user_id', 'department_id', 'position_id', 'manager_id',
        'first_name', 'last_name', 'photo', 'birth_date', 'birth_place',
        'gender', 'nationality', 'national_id', 'social_security_number',
        'personal_email', 'professional_email', 'phone_personal', 'phone_professional',
        'address', 'city', 'postal_code', 'country',
        'hire_date', 'termination_date', 'status',
        'base_salary', 'bank_account', 'annual_leave_days', 'rtt_days',
        // Congés
        'nbre_jour_conge', 'nbre_jour_restant', 'date_dernier_calcul_conge',
        'anciennete_recrutement', 'nombre_enfants_charge', 'a_medaille_travail',
    ];

    protected function casts(): array
    {
        return [
            'birth_date'                  => 'date',
            'hire_date'                   => 'date',
            'termination_date'            => 'date',
            'date_dernier_calcul_conge'   => 'date',
            'base_salary'                 => 'decimal:2',
            'nbre_jour_restant'           => 'decimal:1',
            'a_medaille_travail'          => 'boolean',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (!$this->photo) return null;
        return Storage::disk('public')->url($this->photo);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function familyMembers()
    {
        return $this->hasMany(EmployeeFamilyMember::class);
    }

    public function children()
    {
        return $this->hasMany(EmployeeFamilyMember::class)
            ->whereIn('relation', EmployeeFamilyMember::CHILD_RELATIONS);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function subordinates()
    {
        return $this->hasMany(Employee::class, 'manager_id');
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function activeContract()
    {
        return $this->hasOne(Contract::class)->where('is_active', true)->latest();
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function justifications()
    {
        return $this->hasMany(Justification::class);
    }

    public function payslips()
    {
        return $this->hasMany(Payslip::class);
    }

    public function availabilities()
    {
        return $this->hasMany(Availability::class);
    }
}
