<?php

namespace App\Services\IA\Tools;

use App\Models\CompanySetting;
use App\Models\Employee;
use App\Models\Leave;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GenererDocumentTool implements IATool
{
    public function name(): string
    {
        return 'generer_document';
    }

    public function description(): string
    {
        return 'Génère un document RH officiel en PDF (attestation de travail, attestation de congé, attestation de salaire) et retourne un lien de téléchargement.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'type_document' => [
                    'type' => 'string',
                    'enum' => ['attestation_travail', 'attestation_conge', 'attestation_salaire'],
                    'description' => 'Type de document : attestation_travail, attestation_conge, attestation_salaire',
                ],
                'employee_number' => [
                    'type' => 'string',
                    'description' => 'Matricule de l\'agent (optionnel, par défaut l\'agent connecté)',
                ],
                'nom' => [
                    'type' => 'string',
                    'description' => 'Nom ou prénom de l\'agent à rechercher',
                ],
            ],
            'required' => ['type_document'],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $type = $input['type_document'] ?? null;

        $employee = $this->resolveEmployee($input, $user);

        if (! $employee) {
            return ['erreur' => 'Agent introuvable. Vérifiez le matricule ou le nom.'];
        }

        // Contrôle d'accès
        if ($user->hasRole('employe') && $employee->user_id !== $user->id) {
            return ['erreur' => 'Accès refusé. Vous ne pouvez générer des documents que pour vous-même.'];
        }

        if ($user->hasRole('manager')
            && $employee->user?->department_id !== $user->department_id
        ) {
            return ['erreur' => 'Accès refusé. Cet agent n\'est pas dans votre direction.'];
        }

        $company = CompanySetting::current();

        return match ($type) {
            'attestation_travail'  => $this->genererAttestationTravail($employee, $company),
            'attestation_conge'    => $this->genererAttestationConge($employee, $company),
            'attestation_salaire'  => $this->genererAttestationSalaire($employee, $company),
            default                => ['erreur' => "Type de document inconnu : {$type}"],
        };
    }

    private function resolveEmployee(array $input, User $user): ?Employee
    {
        if (! empty($input['employee_number'])) {
            return Employee::where('employee_number', $input['employee_number'])->first();
        }

        if (! empty($input['nom'])) {
            $q = trim($input['nom']);
            return Employee::where('status', 'active')
                ->where(function ($query) use ($q) {
                    $query->where('first_name', 'like', "%{$q}%")
                          ->orWhere('last_name', 'like', "%{$q}%");
                })->first();
        }

        // Par défaut : l'agent connecté
        return $user->employee;
    }

    private function genererAttestationTravail(Employee $employee, CompanySetting $company): array
    {
        $data = [
            'employee' => $employee,
            'company'  => $company,
            'date'     => Carbon::now()->translatedFormat('d F Y'),
            'ref'      => 'ATT-' . strtoupper($employee->employee_number) . '-' . now()->format('Ymd'),
        ];

        return $this->buildPdf('documents.attestation_travail', $data, 'attestation_travail', $employee);
    }

    private function genererAttestationConge(Employee $employee, CompanySetting $company): array
    {
        $leave = Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->orderByDesc('start_date')
            ->with('leaveType')
            ->first();

        if (! $leave) {
            return ['erreur' => 'Aucun congé approuvé trouvé pour cet agent.'];
        }

        $data = [
            'employee' => $employee,
            'company'  => $company,
            'leave'    => $leave,
            'date'     => Carbon::now()->translatedFormat('d F Y'),
            'ref'      => 'ATT-CG-' . strtoupper($employee->employee_number) . '-' . now()->format('Ymd'),
        ];

        return $this->buildPdf('documents.attestation_conge', $data, 'attestation_conge', $employee);
    }

    private function genererAttestationSalaire(Employee $employee, CompanySetting $company): array
    {
        $salaire = $employee->salary ?? $employee->base_salary ?? null;

        $data = [
            'employee' => $employee,
            'company'  => $company,
            'salaire'  => $salaire,
            'date'     => Carbon::now()->translatedFormat('d F Y'),
            'ref'      => 'ATT-SAL-' . strtoupper($employee->employee_number) . '-' . now()->format('Ymd'),
        ];

        return $this->buildPdf('documents.attestation_salaire', $data, 'attestation_salaire', $employee);
    }

    private function buildPdf(string $view, array $data, string $prefix, Employee $employee): array
    {
        $pdf      = Pdf::loadView($view, $data)->setPaper('a4');
        $filename = $prefix . '_' . $employee->employee_number . '_' . now()->format('YmdHis') . '_' . Str::random(6) . '.pdf';
        $path     = 'documents/generated/' . $filename;

        Storage::disk('public')->put($path, $pdf->output());

        $url = Storage::disk('public')->url($path);

        return [
            'document_genere'    => true,
            'type'               => $prefix,
            'agent'              => $employee->first_name . ' ' . $employee->last_name,
            'matricule'          => $employee->employee_number,
            'url_telechargement' => $url,
            'expire_dans'        => '24 heures',
        ];
    }
}
