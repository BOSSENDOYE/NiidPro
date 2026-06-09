<?php

namespace App\Http\Controllers\Api;

use App\Models\Training;
use App\Models\TrainingType;
use App\Models\TrainingProvider;
use App\Models\TrainingBudget;
use App\Models\TrainingCostCenter;
use App\Models\TrainingDocument;
use App\Models\TrainingParticipant;
use App\Models\TrainingAttendance;
use App\Models\TrainingEvaluation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class TrainingController
{
    /**
     * Lister les formations avec filtrage
     */
    public function index(Request $request): JsonResponse
    {
        $query = Training::with(['trainingType', 'provider', 'participants.employee', 'approver', 'creator']);

        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->get('priority'));
        }

        if ($request->has('type_id')) {
            $query->where('training_type_id', $request->get('type_id'));
        }

        if ($request->has('from_date')) {
            $query->whereDate('desired_date', '>=', $request->get('from_date'));
        }

        if ($request->has('to_date')) {
            $query->whereDate('desired_date', '<=', $request->get('to_date'));
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('title', 'like', "%$search%")
                  ->orWhere('objectives', 'like', "%$search%");
        }

        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 15);

        $trainings = $query->orderBy('desired_date', 'desc')->paginate($perPage, ['*'], 'page', $page);

        return response()->json($trainings);
    }

    /**
     * Lister les formations en attente de validation
     */
    public function pending(Request $request): JsonResponse
    {
        $trainings = Training::where('status', 'pending')
            ->with(['trainingType', 'provider', 'creator'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($trainings);
    }

    /**
     * Créer une nouvelle formation
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'              => ['required', 'string', 'max:255'],
            'training_type_id'   => ['required', 'exists:training_types,id'],
            'provider_id'        => ['nullable', 'exists:training_providers,id'],
            'is_internal'        => ['required', 'boolean'],
            'objectives'         => ['required', 'string'],
            'justification'      => ['required', 'string'],
            'participants_count' => ['required', 'integer', 'min:1'],
            'desired_date'       => ['required', 'date'],
            'duration_days'      => ['required', 'integer', 'min:1'],
            'location'           => ['nullable', 'string', 'max:255'],
            'estimated_cost'     => ['nullable', 'numeric', 'min:0'],
            'funding_source'     => ['nullable', 'string', 'max:255'],
            'priority'           => ['required', 'in:low,medium,high'],
        ]);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'pending';

        $training = Training::create($validated);

        return response()->json($training->load('trainingType', 'provider'), 201);
    }

    /**
     * Afficher une formation
     */
    public function show(Training $training): JsonResponse
    {
        $training->load([
            'trainingType',
            'provider',
            'costCenter.department',
            'participants.employee.department',
            'attendances.employee',
            'evaluations.employee',
            'documents.employee',
            'approver',
            'creator'
        ]);

        return response()->json($training);
    }

    /**
     * Mettre à jour une formation
     */
    public function update(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'title'              => ['nullable', 'string', 'max:255'],
            'training_type_id'   => ['nullable', 'exists:training_types,id'],
            'provider_id'        => ['nullable', 'exists:training_providers,id'],
            'is_internal'        => ['nullable', 'boolean'],
            'objectives'         => ['nullable', 'string'],
            'justification'      => ['nullable', 'string'],
            'participants_count' => ['nullable', 'integer', 'min:1'],
            'desired_date'       => ['nullable', 'date'],
            'duration_days'      => ['nullable', 'integer', 'min:1'],
            'location'           => ['nullable', 'string', 'max:255'],
            'estimated_cost'     => ['nullable', 'numeric', 'min:0'],
            'funding_source'     => ['nullable', 'string', 'max:255'],
            'priority'           => ['nullable', 'in:low,medium,high'],
            'start_date'         => ['nullable', 'date'],
            'end_date'           => ['nullable', 'date'],
            'actual_cost'        => ['nullable', 'numeric', 'min:0'],
        ]);

        $training->update($validated);

        return response()->json($training->fresh()->load('trainingType', 'provider'));
    }

    /**
     * Supprimer une formation
     */
    public function destroy(Training $training): JsonResponse
    {
        $training->delete();
        return response()->json(null, 204);
    }

    /**
     * Approuver une formation
     */
    public function approve(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'comment' => ['nullable', 'string'],
        ]);

        $training->update([
            'status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return response()->json($training->fresh());
    }

    /**
     * Rejeter une formation
     */
    public function reject(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string'],
            'comment'          => ['nullable', 'string'],
        ]);

        $training->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json($training->fresh());
    }

    /**
     * Ajouter des participants
     */
    public function addParticipants(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'employee_ids' => ['required', 'array', 'min:1'],
            'employee_ids.*' => ['integer', 'exists:employees,id'],
        ]);

        $employeeIds = $validated['employee_ids'];

        foreach ($employeeIds as $employeeId) {
            TrainingParticipant::firstOrCreate([
                'training_id' => $training->id,
                'employee_id' => $employeeId,
            ]);
        }

        $training->update(['participants_count' => $training->participants()->count()]);

        return response()->json($training->fresh()->load('participants.employee'));
    }

    /**
     * Retirer un participant
     */
    public function removeParticipant(Training $training, $employeeId): JsonResponse
    {
        TrainingParticipant::where('training_id', $training->id)
            ->where('employee_id', $employeeId)
            ->delete();

        $training->update(['participants_count' => $training->participants()->count()]);

        return response()->json($training->fresh()->load('participants.employee'));
    }

    /**
     * Enregistrer la présence pour un participant
     */
    public function recordAttendance(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'present' => ['required', 'boolean'],
            'absence_reason' => ['nullable', 'string', 'required_if:present,false'],
        ]);

        $attendance = TrainingAttendance::updateOrCreate(
            [
                'training_id' => $training->id,
                'employee_id' => $validated['employee_id'],
                'attendance_date' => now()->toDateString(),
            ],
            [
                'present' => $validated['present'],
                'absence_reason' => $validated['absence_reason'] ?? null,
            ]
        );

        return response()->json($attendance);
    }

    /**
     * Enregistrer / mettre à jour l'évaluation d'un participant
     */
    public function evaluate(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'score'       => ['nullable', 'integer', 'min:0', 'max:100'],
            'feedback'    => ['nullable', 'string'],
        ]);

        $evaluation = TrainingEvaluation::updateOrCreate(
            [
                'training_id' => $training->id,
                'employee_id' => $validated['employee_id'],
            ],
            [
                'score'           => $validated['score'] ?? null,
                'feedback'        => $validated['feedback'] ?? null,
                'evaluator_name'  => auth()->user()?->name,
                'evaluation_date' => now(),
                'status'          => 'completed',
            ]
        );

        return response()->json($evaluation->load('employee'));
    }

    /**
     * Lister les évaluations d'une formation
     */
    public function evaluations(Training $training): JsonResponse
    {
        $evaluations = $training->evaluations()
            ->with('employee')
            ->get();

        return response()->json($evaluations);
    }

    /**
     * Lister les types de formation
     */
    public function types(): JsonResponse
    {
        $types = TrainingType::all();
        return response()->json($types);
    }

    /**
     * Lister les organismes de formation
     */
    public function providers(): JsonResponse
    {
        $providers = TrainingProvider::all();
        return response()->json($providers);
    }

    /**
     * Lister les budgets
     */
    public function budgets(Request $request): JsonResponse
    {
        $query = TrainingBudget::with('department');

        if ($request->has('year')) {
            $query->where('year', $request->get('year'));
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->get('department_id'));
        }

        $budgets = $query->get();
        return response()->json($budgets);
    }

    /**
     * Créer/Mettre à jour un type de formation
     */
    public function storeType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'unique:training_types'],
            'code' => ['required', 'string', 'unique:training_types'],
            'description' => ['nullable', 'string'],
        ]);

        $type = TrainingType::create($validated);
        return response()->json($type, 201);
    }

    /**
     * Créer/Mettre à jour un organisme
     */
    public function storeProvider(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'unique:training_providers'],
            'contact_person' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'country' => ['nullable', 'string'],
        ]);

        $provider = TrainingProvider::create($validated);
        return response()->json($provider, 201);
    }

    /**
     * Créer/Mettre à jour un budget
     */
    public function storeBudget(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'year' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $budget = TrainingBudget::create($validated);
        return response()->json($budget, 201);
    }

    /* ════════════════════════════════════════════════════════════════
     *  BLOC 1 — WORKFLOW RH (compléments, planification, statuts)
     * ════════════════════════════════════════════════════════════════ */

    /**
     * Demander des compléments d'information sur une demande
     */
    public function requestInfo(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'info_request' => ['required', 'string'],
        ]);

        $training->update([
            'status'       => 'needs_info',
            'info_request' => $validated['info_request'],
        ]);

        return response()->json($training->fresh());
    }

    /**
     * Planifier une formation approuvée (dates, lieu) → statut planned
     */
    public function plan(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'start_date'     => ['required', 'date'],
            'end_date'       => ['required', 'date', 'after_or_equal:start_date'],
            'location'       => ['nullable', 'string', 'max:255'],
            'provider_id'    => ['nullable', 'exists:training_providers,id'],
            'cost_center_id' => ['nullable', 'exists:training_cost_centers,id'],
        ]);

        $validated['status'] = 'planned';
        $training->update($validated);

        return response()->json($training->fresh()->load('trainingType', 'provider', 'costCenter'));
    }

    /**
     * Changer le statut d'une formation (planned → in_progress → completed → archived)
     */
    public function setStatus(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'status'          => ['required', 'in:planned,in_progress,completed,archived'],
            'report'          => ['nullable', 'string'],
            'recommendations' => ['nullable', 'string'],
            'overall_score'   => ['nullable', 'integer', 'min:0', 'max:100'],
            'actual_cost'     => ['nullable', 'numeric', 'min:0'],
        ]);

        $training->update($validated);

        // À la clôture : consommation budgétaire automatique
        if ($validated['status'] === 'completed') {
            $this->consumeBudget($training->fresh());
        }

        return response()->json($training->fresh()->load('trainingType', 'provider', 'costCenter'));
    }

    /**
     * Incrémente le budget consommé à la clôture d'une formation
     */
    private function consumeBudget(Training $training): void
    {
        $cost = $training->actual_cost ?? $training->estimated_cost;
        if (!$cost) {
            return;
        }

        $year = $training->start_date
            ? \Carbon\Carbon::parse($training->start_date)->year
            : now()->year;

        $departmentId = $training->costCenter?->department_id;

        $budget = TrainingBudget::where('year', $year)
            ->where('department_id', $departmentId)
            ->first();

        // Repli sur le budget central si aucun budget de service trouvé
        if (!$budget && $departmentId) {
            $budget = TrainingBudget::where('year', $year)->whereNull('department_id')->first();
        }

        if ($budget) {
            $budget->increment('consumed_amount', $cost);
        }
    }

    /* ════════════════════════════════════════════════════════════════
     *  BLOC 2 — TABLEAUX DE BORD / STATISTIQUES
     * ════════════════════════════════════════════════════════════════ */

    public function statistics(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);

        $trainings = Training::with(['trainingType', 'costCenter.department', 'participants.employee.department'])
            ->whereYear('desired_date', $year)
            ->orWhereYear('start_date', $year)
            ->get();

        // KPIs globaux
        $kpis = [
            'total'        => $trainings->count(),
            'pending'      => $trainings->where('status', 'pending')->count(),
            'approved'     => $trainings->where('status', 'approved')->count(),
            'planned'      => $trainings->where('status', 'planned')->count(),
            'in_progress'  => $trainings->where('status', 'in_progress')->count(),
            'completed'    => $trainings->where('status', 'completed')->count(),
            'rejected'     => $trainings->where('status', 'rejected')->count(),
            'total_cost'   => round($trainings->sum(fn ($t) => (float) ($t->actual_cost ?? $t->estimated_cost ?? 0)), 2),
        ];

        // Formations par service (département du centre de coûts)
        $byService = $trainings->groupBy(fn ($t) => $t->costCenter?->department?->name ?? 'Non affecté')
            ->map(fn ($group, $name) => [
                'service'   => $name,
                'count'     => $group->count(),
                'completed' => $group->where('status', 'completed')->count(),
                'cost'      => round($group->sum(fn ($t) => (float) ($t->actual_cost ?? $t->estimated_cost ?? 0)), 2),
            ])->values();

        // Formations par type
        $byType = $trainings->groupBy(fn ($t) => $t->trainingType?->name ?? '—')
            ->map(fn ($group, $name) => ['type' => $name, 'count' => $group->count()])
            ->values();

        // Formations par agent + taux de participation
        $participantRows = [];
        $totalExpected = 0;
        $totalPresent  = 0;

        foreach ($trainings as $t) {
            foreach ($t->participants as $p) {
                $emp = $p->employee;
                $key = $p->employee_id;
                if (!isset($participantRows[$key])) {
                    $participantRows[$key] = [
                        'employee_id'   => $key,
                        'name'          => $emp ? trim("{$emp->first_name} {$emp->last_name}") : '—',
                        'department'    => $emp?->department?->name ?? '—',
                        'trainings'     => 0,
                        'present'       => 0,
                    ];
                }
                $participantRows[$key]['trainings']++;
            }
        }

        // Présences (taux de participation global)
        $attendances = TrainingAttendance::whereIn('training_id', $trainings->pluck('id'))->get();
        foreach ($attendances as $a) {
            $totalExpected++;
            if ($a->present) {
                $totalPresent++;
                if (isset($participantRows[$a->employee_id])) {
                    $participantRows[$a->employee_id]['present']++;
                }
            }
        }

        $participationRate = $totalExpected > 0 ? round(($totalPresent / $totalExpected) * 100, 1) : 0;

        // Statistiques annuelles (3 dernières années)
        $byYear = Training::selectRaw('YEAR(COALESCE(start_date, desired_date)) as yr, COUNT(*) as total,
                SUM(status = "completed") as completed,
                SUM(COALESCE(actual_cost, estimated_cost, 0)) as cost')
            ->groupByRaw('YEAR(COALESCE(start_date, desired_date))')
            ->orderByDesc('yr')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'year'      => (int) $r->yr,
                'total'     => (int) $r->total,
                'completed' => (int) $r->completed,
                'cost'      => round((float) $r->cost, 2),
            ]);

        return response()->json([
            'year'               => (int) $year,
            'kpis'               => $kpis,
            'by_service'         => $byService,
            'by_type'            => $byType,
            'by_employee'        => array_values($participantRows),
            'participation_rate' => $participationRate,
            'by_year'            => $byYear,
        ]);
    }

    /**
     * Historique des formations d'un agent
     */
    public function employeeHistory($employeeId): JsonResponse
    {
        $participations = TrainingParticipant::where('employee_id', $employeeId)
            ->with(['training.trainingType', 'training.provider'])
            ->get()
            ->map(function ($p) {
                $t = $p->training;
                $eval = TrainingEvaluation::where('training_id', $t?->id)
                    ->where('employee_id', $p->employee_id)->first();
                return [
                    'training_id' => $t?->id,
                    'title'       => $t?->title,
                    'type'        => $t?->trainingType?->name,
                    'status'      => $t?->status,
                    'start_date'  => $t?->start_date,
                    'end_date'    => $t?->end_date,
                    'score'       => $eval?->score,
                ];
            });

        return response()->json($participations);
    }

    /* ════════════════════════════════════════════════════════════════
     *  BLOC 3 — PARAMÉTRAGE (CRUD types / organismes / budgets / centres)
     * ════════════════════════════════════════════════════════════════ */

    public function updateType(Request $request, TrainingType $type): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'unique:training_types,name,' . $type->id],
            'code'        => ['required', 'string', 'unique:training_types,code,' . $type->id],
            'description' => ['nullable', 'string'],
        ]);
        $type->update($validated);
        return response()->json($type);
    }

    public function destroyType(TrainingType $type): JsonResponse
    {
        $type->delete();
        return response()->json(null, 204);
    }

    public function updateProvider(Request $request, TrainingProvider $provider): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'unique:training_providers,name,' . $provider->id],
            'contact_person' => ['nullable', 'string'],
            'email'          => ['nullable', 'email'],
            'phone'          => ['nullable', 'string'],
            'address'        => ['nullable', 'string'],
            'city'           => ['nullable', 'string'],
            'country'        => ['nullable', 'string'],
        ]);
        $provider->update($validated);
        return response()->json($provider);
    }

    public function destroyProvider(TrainingProvider $provider): JsonResponse
    {
        $provider->delete();
        return response()->json(null, 204);
    }

    public function updateBudget(Request $request, TrainingBudget $budget): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'year'          => ['required', 'integer'],
            'amount'        => ['required', 'numeric', 'min:0'],
        ]);
        $budget->update($validated);
        return response()->json($budget);
    }

    public function destroyBudget(TrainingBudget $budget): JsonResponse
    {
        $budget->delete();
        return response()->json(null, 204);
    }

    // ── Centres de coûts ──
    public function costCenters(): JsonResponse
    {
        return response()->json(TrainingCostCenter::with('department')->orderBy('name')->get());
    }

    public function storeCostCenter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string'],
            'code'          => ['required', 'string', 'unique:training_cost_centers'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'description'   => ['nullable', 'string'],
            'is_active'     => ['nullable', 'boolean'],
        ]);
        $cc = TrainingCostCenter::create($validated);
        return response()->json($cc, 201);
    }

    public function updateCostCenter(Request $request, TrainingCostCenter $costCenter): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string'],
            'code'          => ['required', 'string', 'unique:training_cost_centers,code,' . $costCenter->id],
            'department_id' => ['nullable', 'exists:departments,id'],
            'description'   => ['nullable', 'string'],
            'is_active'     => ['nullable', 'boolean'],
        ]);
        $costCenter->update($validated);
        return response()->json($costCenter);
    }

    public function destroyCostCenter(TrainingCostCenter $costCenter): JsonResponse
    {
        $costCenter->delete();
        return response()->json(null, 204);
    }

    /* ════════════════════════════════════════════════════════════════
     *  BLOC 4 — DOCUMENTS & ATTESTATIONS
     * ════════════════════════════════════════════════════════════════ */

    public function documents(Training $training): JsonResponse
    {
        return response()->json(
            $training->documents()->with(['employee', 'uploader'])->latest()->get()
        );
    }

    public function uploadDocument(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'file'        => ['required', 'file', 'max:10240'], // 10 Mo
            'category'    => ['required', 'in:piece_jointe,support,certificat,rapport,autre'],
            'name'        => ['nullable', 'string', 'max:255'],
            'employee_id' => ['nullable', 'exists:employees,id'],
        ]);

        $file = $request->file('file');
        $path = $file->store("trainings/{$training->id}", 'public');

        $doc = TrainingDocument::create([
            'training_id' => $training->id,
            'employee_id' => $validated['employee_id'] ?? null,
            'category'    => $validated['category'],
            'name'        => $validated['name'] ?? $file->getClientOriginalName(),
            'file_path'   => $path,
            'mime_type'   => $file->getClientMimeType(),
            'file_size'   => $file->getSize(),
            'uploaded_by' => auth()->id(),
        ]);

        return response()->json($doc->load(['employee', 'uploader']), 201);
    }

    public function deleteDocument(Training $training, TrainingDocument $document): JsonResponse
    {
        if ($document->training_id !== $training->id) {
            return response()->json(['message' => 'Document introuvable.'], 404);
        }

        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }
        $document->delete();

        return response()->json(null, 204);
    }

    /**
     * Générer les attestations/certificats de formation pour les participants
     */
    public function generateCertificates(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['exists:employees,id'],
        ]);

        // Par défaut : tous les participants confirmés
        $query = $training->participants()->with('employee.department');
        if (!empty($validated['employee_ids'])) {
            $query->whereIn('employee_id', $validated['employee_ids']);
        }
        $participants = $query->get();

        $created = [];
        foreach ($participants as $p) {
            $emp = $p->employee;
            if (!$emp) {
                continue;
            }

            $content = $this->buildCertificateHtml($training, $emp);
            $ref     = 'CERT-' . now()->format('Y') . '-' . str_pad((string) $training->id, 4, '0', STR_PAD_LEFT) . '-' . $emp->id;
            $path    = "trainings/{$training->id}/certificats/{$ref}.html";

            Storage::disk('public')->put($path, $content);

            $doc = TrainingDocument::updateOrCreate(
                [
                    'training_id' => $training->id,
                    'employee_id' => $emp->id,
                    'category'    => 'certificat',
                ],
                [
                    'name'        => "Attestation - {$emp->first_name} {$emp->last_name}",
                    'file_path'   => $path,
                    'mime_type'   => 'text/html',
                    'file_size'   => strlen($content),
                    'uploaded_by' => auth()->id(),
                ]
            );

            $created[] = $doc->load('employee');
        }

        return response()->json([
            'count'     => count($created),
            'documents' => $created,
        ], 201);
    }

    private function buildCertificateHtml(Training $training, $employee): string
    {
        $full   = trim("{$employee->first_name} {$employee->last_name}");
        $title  = e($training->title);
        $dates  = $training->start_date
            ? \Carbon\Carbon::parse($training->start_date)->format('d/m/Y')
              . ($training->end_date ? ' au ' . \Carbon\Carbon::parse($training->end_date)->format('d/m/Y') : '')
            : '—';
        $days   = $training->duration_days;
        $today  = now()->format('d/m/Y');

        return <<<HTML
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Attestation de formation</title>
<style>
  body { font-family: Georgia, serif; color:#0F172A; padding:60px; }
  .frame { border:3px double #5B21B5; padding:48px; text-align:center; }
  h1 { color:#5B21B5; letter-spacing:2px; }
  .name { font-size:26px; font-weight:bold; margin:24px 0; }
  .meta { font-size:15px; line-height:1.8; }
  .sign { margin-top:64px; display:flex; justify-content:space-between; font-size:13px; }
</style></head>
<body>
  <div class="frame">
    <h1>ATTESTATION DE FORMATION</h1>
    <p class="meta">Il est attesté que</p>
    <p class="name">{$full}</p>
    <p class="meta">
      a suivi avec succès la formation<br>
      <strong>« {$title} »</strong><br>
      d'une durée de <strong>{$days} jour(s)</strong><br>
      ({$dates})
    </p>
    <div class="sign">
      <span>Fait le {$today}</span>
      <span>La Direction des Ressources Humaines</span>
    </div>
  </div>
</body></html>
HTML;
    }
}
