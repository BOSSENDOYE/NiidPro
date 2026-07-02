<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeFamilyMember;
use App\Services\IrppCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function counts()
    {
        return response()->json([
            'total'     => Employee::count(),
            'active'    => Employee::where('status', 'active')->count(),
            'inactive'  => Employee::where('status', 'inactive')->count(),
            'suspended' => Employee::where('status', 'suspended')->count(),
        ]);
    }

    public function index(Request $request)
    {
        $query = Employee::with(['department', 'position', 'manager', 'activeContract', 'indice.hierarchy'])
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
            $employee->load(['department', 'position', 'manager', 'contracts', 'user', 'familyMembers', 'indice.hierarchy', 'indice.augmentations'])
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
            'manager_id'              => ['nullable', 'exists:employees,id'],
            // Carrière
            'categorie_emploi'        => ['nullable', 'string', 'max:100'],
            'echelon'                 => ['nullable', 'string', 'max:100'],
            'date_entree_echelon'     => ['nullable', 'date'],
            // Paie
            'payroll_template_id'     => ['nullable', 'exists:payroll_templates,id'],
            'indice_id'               => ['nullable', 'exists:recruitment_indices,id'],
            'part_trimf'              => ['nullable', 'numeric', 'min:1', 'max:5'],
            'part_ir'                 => ['nullable', 'numeric', 'min:1', 'max:5'],
        ] + $this->familyRules());

        $family = $data['family_members'] ?? null;
        unset($data['family_members']);

        $employee->update($data);

        if (is_array($family)) {
            $this->syncFamilyMembers($employee, $family);
        }

        return response()->json($employee->fresh()->load(['department', 'position', 'familyMembers', 'indice.hierarchy']));
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

    public function export(Request $request)
    {
        $employees = Employee::with(['department', 'position'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy('last_name')
            ->get();

        $callback = function () use ($employees) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM UTF-8 pour Excel

            fputcsv($file, [
                'Matricule', 'Prénom', 'Nom', 'Email professionnel', 'Téléphone',
                'Service', 'Poste', 'Date embauche', 'Salaire de base', 'Statut',
            ], ';');

            foreach ($employees as $emp) {
                fputcsv($file, [
                    $emp->employee_number ?? '',
                    $emp->first_name,
                    $emp->last_name,
                    $emp->professional_email ?? '',
                    $emp->phone_professional ?? $emp->phone_personal ?? '',
                    $emp->department?->name ?? '',
                    $emp->position?->title ?? '',
                    $emp->hire_date?->format('Y-m-d') ?? '',
                    $emp->base_salary ?? '',
                    $emp->status,
                ], ';');
            }

            fclose($file);
        };

        return response()->streamDownload(
            $callback,
            'agents_' . now()->format('Y-m-d') . '.csv',
            ['Content-Type' => 'text/csv; charset=UTF-8']
        );
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:4096'],
        ]);

        $handle = fopen($request->file('file')->getPathname(), 'r');

        // Sauter le BOM UTF-8 si présent
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            fseek($handle, 0);
        }

        fgetcsv($handle, 1000, ';'); // Ignorer l'en-tête

        $created = 0;
        $skipped = [];
        $line    = 2;

        while (($row = fgetcsv($handle, 1000, ';')) !== false) {
            if (empty(array_filter($row))) { $line++; continue; }

            [$matricule, $prenom, $nom, $email, $tel, $service, , $dateEmbauche, $salaire, $statut]
                = array_pad($row, 10, '');

            if (!trim($prenom) || !trim($nom)) {
                $skipped[] = "Ligne $line : prénom et nom obligatoires.";
                $line++;
                continue;
            }

            try {
                $dept = $service ? \App\Models\Department::where('name', trim($service))->first() : null;

                Employee::create([
                    'employee_number'    => $matricule ?: $this->generateEmployeeNumber(),
                    'first_name'         => trim($prenom),
                    'last_name'          => trim($nom),
                    'professional_email' => $email    ?: null,
                    'phone_professional' => $tel      ?: null,
                    'department_id'      => $dept?->id,
                    'hire_date'          => $dateEmbauche ?: now()->format('Y-m-d'),
                    'base_salary'        => is_numeric($salaire) ? (float) $salaire : null,
                    'status'             => in_array($statut, ['active', 'inactive']) ? $statut : 'active',
                ]);
                $created++;
            } catch (\Exception $e) {
                $skipped[] = "Ligne $line : " . $e->getMessage();
            }

            $line++;
        }

        fclose($handle);

        return response()->json([
            'created' => $created,
            'skipped' => $skipped,
            'message' => "$created agent(s) importé(s) avec succès.",
        ]);
    }

    // ── Paie : données de paie de l'agent ────────────────────────────────────
    public function payeData(Employee $employee)
    {
        $employee->load(['indice.augmentations', 'payrollTemplate']);
        $indice = $employee->indice;

        return response()->json([
            'employee_id'         => $employee->id,
            'matricule'           => $employee->employee_number,
            'nom_complet'         => $employee->full_name,
            'salaire_base'        => (int) ($employee->base_salary ?? 0),
            'sursalaire'          => 0,
            'payroll_template_id' => $employee->payroll_template_id,
            'modele_libelle'      => $employee->payrollTemplate?->name,
            'Part_TRIMF'          => $employee->part_trimf ? (float) $employee->part_trimf : 0,
            'Part_IR'             => $employee->part_ir   ? (float) $employee->part_ir   : 0,
            'Part_Sociale'        => 0,
            'categorie_agent'     => $employee->categorie_emploi ?? null,
            'Prime_de_sujection'  => 0,
            'rapel_avancement'    => 0,
            'indice_code'         => $indice
                ? ($indice->garde ? "{$indice->garde} — {$indice->code}" : $indice->code)
                : null,
            'mld_solde'           => $indice ? (int) ($indice->solde_mensuelle ?? 0) : 0,
        ]);
    }

    // ── Paie : calcul IRPP / TRIMF ───────────────────────────────────────────
    public function calculIrpp(Request $request, Employee $employee): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'sal_brut_social'    => ['required', 'integer', 'min:0'],
            'indem_risque_sante' => ['required', 'integer', 'min:0'],
            'transport'          => ['required', 'integer', 'min:0'],
        ]);

        $result = app(IrppCalculatorService::class)->calculate(
            partIr:           (float) ($employee->part_ir    ?? 1),
            salBrutSocial:    $request->integer('sal_brut_social'),
            indemRisqueSante: $request->integer('indem_risque_sante'),
            transport:        $request->integer('transport'),
            partTrimf:        (float) ($employee->part_trimf ?? 1),
        );

        return response()->json($result);
    }

    // ── Paie : heures supplémentaires du mois ────────────────────────────────
    public function heuresSup(Request $request, Employee $employee)
    {
        $mois  = (int) $request->input('mois',  now()->month);
        $annee = (int) $request->input('annee', now()->year);

        $minutes = \App\Models\Attendance::where('employee_id', $employee->id)
            ->whereYear('date',  $annee)
            ->whereMonth('date', $mois)
            ->sum('overtime_minutes');

        return response()->json([
            'nbr_heure_sup'     => round($minutes / 60, 2),
            'montant_heure_sup' => 0,
        ]);
    }

    // ── Paie : heures de coupure du mois ────────────────────────────────────
    public function heuresCoupure(Request $request, Employee $employee)
    {
        $mois  = (int) $request->input('mois',  now()->month);
        $annee = (int) $request->input('annee', now()->year);

        $joursAbsents = \App\Models\Attendance::where('employee_id', $employee->id)
            ->whereYear('date',  $annee)
            ->whereMonth('date', $mois)
            ->whereIn('status', ['absent'])
            ->count();

        return response()->json([
            'nbr_heure_coupure' => $joursAbsents * 8,
        ]);
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
