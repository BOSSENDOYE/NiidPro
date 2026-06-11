<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeFamilyMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with(['department', 'position', 'manager', 'activeContract'])
            ->when($request->search, fn($q, $s) => $q->where(fn($q) =>
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('employee_number', 'like', "%{$s}%")
                  ->orWhere('professional_email', 'like', "%{$s}%")
            ))
            ->when($request->department_id, fn($q, $d) => $q->where('department_id', $d))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->position_id, fn($q, $p) => $q->where('position_id', $p));

        $employees = $query->orderBy('last_name')->paginate($request->per_page ?? 15);

        return response()->json($employees);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name'           => ['required', 'string', 'max:100'],
            'last_name'            => ['required', 'string', 'max:100'],
            'department_id'        => ['nullable', 'exists:departments,id'],
            'position_id'          => ['nullable', 'exists:positions,id'],
            'professional_email'   => ['nullable', 'email', 'unique:employees'],
            'personal_email'       => ['nullable', 'email'],
            'phone_personal'       => ['nullable', 'string'],
            'phone_professional'   => ['nullable', 'string'],
            'hire_date'            => ['required', 'date'],
            'birth_date'           => ['nullable', 'date'],
            'gender'               => ['nullable', 'in:M,F,other'],
            'nationality'          => ['nullable', 'string'],
            'national_id'          => ['nullable', 'string'],
            'address'              => ['nullable', 'string'],
            'city'                 => ['nullable', 'string'],
            'postal_code'          => ['nullable', 'string'],
            'country'              => ['nullable', 'string'],
            'base_salary'          => ['nullable', 'numeric', 'min:0'],
            'annual_leave_days'    => ['nullable', 'integer', 'min:0'],
            'manager_id'           => ['nullable', 'exists:employees,id'],
        ] + $this->familyRules());

        $family = $data['family_members'] ?? null;
        unset($data['family_members']);

        $data['employee_number'] = $this->generateEmployeeNumber();

        $employee = Employee::create($data);

        if (is_array($family)) {
            $this->syncFamilyMembers($employee, $family);
        }

        return response()->json($employee->load(['department', 'position', 'familyMembers']), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json(
            $employee->load(['department', 'position', 'manager', 'contracts', 'user', 'familyMembers'])
        );
    }

    public function update(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'first_name'         => ['sometimes', 'string', 'max:100'],
            'last_name'          => ['sometimes', 'string', 'max:100'],
            'department_id'      => ['nullable', 'exists:departments,id'],
            'position_id'        => ['nullable', 'exists:positions,id'],
            'professional_email' => ['nullable', 'email', 'unique:employees,professional_email,' . $employee->id],
            'personal_email'     => ['nullable', 'email'],
            'phone_personal'     => ['nullable', 'string'],
            'phone_professional' => ['nullable', 'string'],
            'hire_date'          => ['sometimes', 'date'],
            'birth_date'         => ['nullable', 'date'],
            'gender'             => ['nullable', 'in:M,F,other'],
            'nationality'        => ['nullable', 'string'],
            'national_id'        => ['nullable', 'string'],
            'address'            => ['nullable', 'string'],
            'city'               => ['nullable', 'string'],
            'postal_code'        => ['nullable', 'string'],
            'country'            => ['nullable', 'string'],
            'base_salary'        => ['nullable', 'numeric', 'min:0'],
            'annual_leave_days'  => ['nullable', 'integer', 'min:0'],
            'status'             => ['nullable', 'in:active,inactive,on_leave,terminated'],
            'manager_id'         => ['nullable', 'exists:employees,id'],
        ] + $this->familyRules());

        $family = $data['family_members'] ?? null;
        unset($data['family_members']);

        $employee->update($data);

        if (is_array($family)) {
            $this->syncFamilyMembers($employee, $family);
        }

        return response()->json($employee->fresh()->load(['department', 'position', 'familyMembers']));
    }

    /** Règles de validation des membres de la famille (onglet Conjoints/Enfants) */
    private function familyRules(): array
    {
        return [
            'family_members'                 => ['nullable', 'array'],
            'family_members.*.relation'      => ['required', 'string', Rule::in(['Conjoint(e)', 'Fils', 'Fille', 'Autre'])],
            'family_members.*.first_name'    => ['nullable', 'string', 'max:100'],
            'family_members.*.last_name'     => ['nullable', 'string', 'max:100'],
            'family_members.*.birth_date'    => ['nullable', 'date'],
            'family_members.*.birth_place'   => ['nullable', 'string', 'max:150'],
            'family_members.*.gender'        => ['nullable', 'in:M,F'],
            'family_members.*.activity'      => ['nullable', 'string', 'max:150'],
            'family_members.*.document_type' => ['nullable', 'string', 'max:150'],
        ];
    }

    /** Remplace l'ensemble des membres de la famille de l'agent */
    private function syncFamilyMembers(Employee $employee, array $members): void
    {
        $employee->familyMembers()->delete();

        foreach ($members as $m) {
            // Ignorer les lignes totalement vides
            if (empty($m['first_name']) && empty($m['last_name']) && empty($m['birth_date'])) {
                continue;
            }
            $employee->familyMembers()->create([
                'relation'      => $m['relation'] ?? 'Autre',
                'first_name'    => $m['first_name'] ?? null,
                'last_name'     => $m['last_name'] ?? null,
                'birth_date'    => $m['birth_date'] ?? null,
                'birth_place'   => $m['birth_place'] ?? null,
                'gender'        => $m['gender'] ?? null,
                'activity'      => $m['activity'] ?? null,
                'document_type' => $m['document_type'] ?? null,
            ]);
        }
    }

    public function uploadPhoto(Request $request, Employee $employee)
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:3072'],
        ]);

        if ($employee->photo) {
            Storage::disk('public')->delete($employee->photo);
        }

        $path = $request->file('photo')->store('employees/photos', 'public');
        $employee->update(['photo' => $path]);

        return response()->json($employee->fresh()->load(['department', 'position']));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(['message' => 'Employé supprimé.']);
    }

    private function generateEmployeeNumber(): string
    {
        $last = Employee::withTrashed()->orderByDesc('id')->first();
        $num  = $last ? (int) substr($last->employee_number, 3) + 1 : 1;
        return 'EMP' . str_pad($num, 4, '0', STR_PAD_LEFT);
    }
}
