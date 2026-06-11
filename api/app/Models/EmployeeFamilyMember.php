<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class EmployeeFamilyMember extends Model
{
    protected $table = 'employee_family_members';

    /** Valeurs de "relation" considérées comme des enfants */
    public const CHILD_RELATIONS = ['Fils', 'Fille'];

    protected $fillable = [
        'employee_id', 'relation', 'first_name', 'last_name',
        'birth_date', 'birth_place', 'gender', 'activity', 'document_type',
    ];

    protected $appends = ['age', 'is_child'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /** Âge en années révolues à une date donnée (aujourd'hui par défaut) */
    public function ageAt(?Carbon $asOf = null): ?int
    {
        if (!$this->birth_date) {
            return null;
        }
        $asOf = $asOf ?? Carbon::now();
        return Carbon::parse($this->birth_date)->diffInYears($asOf);
    }

    public function getAgeAttribute(): ?int
    {
        return $this->ageAt();
    }

    public function getIsChildAttribute(): bool
    {
        return in_array($this->relation, self::CHILD_RELATIONS, true);
    }
}
