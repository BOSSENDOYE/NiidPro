<?php

namespace App\Http\Controllers\Api;

use App\Models\RecruitmentRequest;
use App\Models\JobPosting;
use App\Models\JobPostingCriterion;
use App\Models\JobApplication;
use App\Models\ApplicationDocument;
use App\Models\Interview;
use App\Models\InterviewEvaluation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RecruitmentController
{
    // ═══════════════════════════════════════════════════════
    //  DEMANDES DE RECRUTEMENT
    // ═══════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $query = RecruitmentRequest::with(['department', 'requester', 'approver']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->get('department_id'));
        }
        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where('position_title', 'like', "%$s%");
        }

        $requests = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($requests);
    }

    public function pending(): JsonResponse
    {
        $requests = RecruitmentRequest::where('status', 'pending_rh')
            ->with(['department', 'requester'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department_id'        => ['required', 'exists:departments,id'],
            'position_title'       => ['required', 'string', 'max:255'],
            'number_of_positions'  => ['required', 'integer', 'min:1'],
            'contract_type'        => ['required', 'in:CDI,CDD,Stage,Consultant,Freelance,Autre'],
            'desired_start_date'   => ['nullable', 'date'],
            'justification'        => ['required', 'string'],
            'hierarchical_level'   => ['nullable', 'string', 'max:255'],
            'budget'               => ['nullable', 'numeric', 'min:0'],
        ]);

        $validated['requested_by'] = auth()->id();
        $validated['status'] = $request->get('submit') ? 'pending_rh' : 'draft';

        $recruitmentRequest = RecruitmentRequest::create($validated);

        return response()->json(
            $recruitmentRequest->load('department', 'requester'),
            201
        );
    }

    public function show(RecruitmentRequest $recruitmentRequest): JsonResponse
    {
        return response()->json(
            $recruitmentRequest->load('department', 'requester', 'approver', 'jobPostings.department')
        );
    }

    public function update(Request $request, RecruitmentRequest $recruitmentRequest): JsonResponse
    {
        if (in_array($recruitmentRequest->status, ['approved', 'rejected', 'closed'])) {
            return response()->json(['message' => 'Cette demande ne peut plus être modifiée.'], 422);
        }

        $validated = $request->validate([
            'department_id'       => ['sometimes', 'exists:departments,id'],
            'position_title'      => ['sometimes', 'string', 'max:255'],
            'number_of_positions' => ['sometimes', 'integer', 'min:1'],
            'contract_type'       => ['sometimes', 'in:CDI,CDD,Stage,Consultant,Freelance,Autre'],
            'desired_start_date'  => ['nullable', 'date'],
            'justification'       => ['sometimes', 'string'],
            'hierarchical_level'  => ['nullable', 'string', 'max:255'],
            'budget'              => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($request->get('submit') && $recruitmentRequest->status === 'draft') {
            $validated['status'] = 'pending_rh';
        }

        $recruitmentRequest->update($validated);

        return response()->json($recruitmentRequest->load('department', 'requester'));
    }

    public function destroy(RecruitmentRequest $recruitmentRequest): JsonResponse
    {
        if ($recruitmentRequest->status !== 'draft') {
            return response()->json(['message' => 'Seules les demandes en brouillon peuvent être supprimées.'], 422);
        }
        $recruitmentRequest->delete();

        return response()->json(null, 204);
    }

    public function approve(Request $request, RecruitmentRequest $recruitmentRequest): JsonResponse
    {
        if ($recruitmentRequest->status !== 'pending_rh') {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être approuvées.'], 422);
        }

        $recruitmentRequest->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return response()->json($recruitmentRequest->load('department', 'requester', 'approver'));
    }

    public function reject(Request $request, RecruitmentRequest $recruitmentRequest): JsonResponse
    {
        $request->validate(['reason' => ['required', 'string']]);

        if ($recruitmentRequest->status !== 'pending_rh') {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être rejetées.'], 422);
        }

        $recruitmentRequest->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->get('reason'),
        ]);

        return response()->json($recruitmentRequest->load('department', 'requester'));
    }

    // ═══════════════════════════════════════════════════════
    //  OFFRES D'EMPLOI / FICHES DE POSTE
    // ═══════════════════════════════════════════════════════

    public function jobPostings(Request $request): JsonResponse
    {
        $query = JobPosting::with(['department', 'creator', 'supervisor', 'recruitmentRequest']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->get('department_id'));
        }
        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where('title', 'like', "%$s%");
        }

        $postings = $query->withCount('applications')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($postings);
    }

    public function storeJobPosting(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recruitment_request_id'  => ['nullable', 'exists:recruitment_requests,id'],
            'department_id'           => ['required', 'exists:departments,id'],
            'title'                   => ['required', 'string', 'max:255'],
            'location'                => ['nullable', 'string', 'max:255'],
            'supervisor_id'           => ['nullable', 'exists:employees,id'],
            'description'             => ['nullable', 'string'],
            'missions'                => ['nullable', 'string'],
            'responsibilities'        => ['nullable', 'string'],
            'education_level'         => ['nullable', 'string', 'max:255'],
            'required_diplomas'       => ['nullable', 'string'],
            'required_experience_years' => ['nullable', 'integer', 'min:0'],
            'technical_skills'        => ['nullable', 'array'],
            'behavioral_skills'       => ['nullable', 'array'],
            'required_certifications' => ['nullable', 'string'],
            'required_languages'      => ['nullable', 'array'],
            'publication_type'        => ['required', 'in:internal,external,both'],
            'closing_date'            => ['nullable', 'date'],
        ]);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'draft';

        $posting = JobPosting::create($validated);

        if ($request->filled('recruitment_request_id')) {
            RecruitmentRequest::where('id', $request->get('recruitment_request_id'))
                ->where('status', 'approved')
                ->update(['status' => 'in_progress']);
        }

        return response()->json(
            $posting->load('department', 'creator', 'supervisor'),
            201
        );
    }

    public function showJobPosting(JobPosting $jobPosting): JsonResponse
    {
        return response()->json(
            $jobPosting->load('department', 'creator', 'supervisor', 'recruitmentRequest', 'criteria', 'applications')
        );
    }

    public function updateJobPosting(Request $request, JobPosting $jobPosting): JsonResponse
    {
        if ($jobPosting->status === 'archived') {
            return response()->json(['message' => 'Une offre archivée ne peut plus être modifiée.'], 422);
        }

        $validated = $request->validate([
            'department_id'            => ['sometimes', 'exists:departments,id'],
            'title'                    => ['sometimes', 'string', 'max:255'],
            'location'                 => ['nullable', 'string', 'max:255'],
            'supervisor_id'            => ['nullable', 'exists:employees,id'],
            'description'              => ['nullable', 'string'],
            'missions'                 => ['nullable', 'string'],
            'responsibilities'         => ['nullable', 'string'],
            'education_level'          => ['nullable', 'string', 'max:255'],
            'required_diplomas'        => ['nullable', 'string'],
            'required_experience_years' => ['nullable', 'integer', 'min:0'],
            'technical_skills'         => ['nullable', 'array'],
            'behavioral_skills'        => ['nullable', 'array'],
            'required_certifications'  => ['nullable', 'string'],
            'required_languages'       => ['nullable', 'array'],
            'publication_type'         => ['sometimes', 'in:internal,external,both'],
            'closing_date'             => ['nullable', 'date'],
        ]);

        $jobPosting->update($validated);

        return response()->json($jobPosting->load('department', 'creator', 'supervisor', 'criteria'));
    }

    public function publishJobPosting(JobPosting $jobPosting): JsonResponse
    {
        if (!in_array($jobPosting->status, ['draft'])) {
            return response()->json(['message' => 'Seules les offres en brouillon peuvent être publiées.'], 422);
        }

        $jobPosting->update([
            'status'       => 'published',
            'published_at' => now(),
        ]);

        return response()->json($jobPosting->load('department', 'creator'));
    }

    public function closeJobPosting(JobPosting $jobPosting): JsonResponse
    {
        if ($jobPosting->status !== 'published') {
            return response()->json(['message' => 'Seules les offres publiées peuvent être clôturées.'], 422);
        }

        $jobPosting->update(['status' => 'closed']);

        return response()->json($jobPosting->load('department', 'creator'));
    }

    public function destroyJobPosting(JobPosting $jobPosting): JsonResponse
    {
        if ($jobPosting->status === 'published') {
            return response()->json(['message' => 'Clôturez l\'offre avant de la supprimer.'], 422);
        }
        $jobPosting->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  CRITÈRES D'ÉVALUATION
    // ═══════════════════════════════════════════════════════

    public function criteria(JobPosting $jobPosting): JsonResponse
    {
        return response()->json($jobPosting->criteria()->get());
    }

    public function storeCriterion(Request $request, JobPosting $jobPosting): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'weight'         => ['required', 'integer', 'min:1', 'max:100'],
            'minimum_level'  => ['required', 'integer', 'min:1', 'max:5'],
            'is_eliminatory' => ['required', 'boolean'],
        ]);

        $validated['job_posting_id'] = $jobPosting->id;
        $criterion = JobPostingCriterion::create($validated);

        return response()->json($criterion, 201);
    }

    public function updateCriterion(Request $request, JobPosting $jobPosting, JobPostingCriterion $criterion): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255'],
            'weight'         => ['sometimes', 'integer', 'min:1', 'max:100'],
            'minimum_level'  => ['sometimes', 'integer', 'min:1', 'max:5'],
            'is_eliminatory' => ['sometimes', 'boolean'],
        ]);

        $criterion->update($validated);

        return response()->json($criterion);
    }

    public function destroyCriterion(JobPosting $jobPosting, JobPostingCriterion $criterion): JsonResponse
    {
        $criterion->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  CANDIDATURES
    // ═══════════════════════════════════════════════════════

    public function applications(Request $request, JobPosting $jobPosting): JsonResponse
    {
        $query = $jobPosting->applications()->with(['employee', 'documents', 'interviews']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        return response()->json($query->orderBy('application_date', 'desc')->get());
    }

    public function allApplications(Request $request): JsonResponse
    {
        $query = JobApplication::with(['jobPosting.department', 'employee']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }
        if ($request->filled('job_posting_id')) {
            $query->where('job_posting_id', $request->get('job_posting_id'));
        }

        $apps = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($apps);
    }

    public function storeApplication(Request $request, JobPosting $jobPosting): JsonResponse
    {
        if ($jobPosting->status !== 'published') {
            return response()->json(['message' => 'Les candidatures ne sont acceptées que sur les offres publiées.'], 422);
        }

        $validated = $request->validate([
            'first_name'       => ['required', 'string', 'max:255'],
            'last_name'        => ['required', 'string', 'max:255'],
            'email'            => ['required', 'email', 'max:255'],
            'phone'            => ['nullable', 'string', 'max:30'],
            'is_internal'      => ['boolean'],
            'employee_id'      => ['nullable', 'exists:employees,id'],
            'notes'            => ['nullable', 'string'],
        ]);

        $validated['job_posting_id']     = $jobPosting->id;
        $validated['application_date']   = now()->toDateString();
        $validated['status']             = 'received';
        $validated['application_number'] = 'CAND-' . strtoupper(Str::random(8));

        $application = JobApplication::create($validated);

        return response()->json($application->load('jobPosting', 'employee'), 201);
    }

    public function showApplication(JobApplication $application): JsonResponse
    {
        return response()->json(
            $application->load('jobPosting.department', 'employee', 'documents', 'interviews.evaluations.evaluator')
        );
    }

    public function updateApplicationStatus(Request $request, JobApplication $application): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:received,pre_selected,rejected_pre,convoked,interviewed,rejected,selected,hired'],
            'notes'  => ['nullable', 'string'],
        ]);

        $application->update([
            'status' => $request->get('status'),
            'notes'  => $request->get('notes', $application->notes),
        ]);

        return response()->json($application->load('jobPosting', 'employee'));
    }

    public function uploadApplicationDocument(Request $request, JobApplication $application): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'type' => ['required', 'in:cv,lettre_motivation,diplome,certificat,autre'],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $path = $request->file('file')->store('recruitment/documents', 'public');

        $document = ApplicationDocument::create([
            'application_id' => $application->id,
            'type'           => $request->get('type'),
            'name'           => $request->get('name'),
            'file_path'      => $path,
            'mime_type'      => $request->file('file')->getMimeType(),
            'file_size'      => $request->file('file')->getSize(),
        ]);

        return response()->json($document, 201);
    }

    // ═══════════════════════════════════════════════════════
    //  ENTRETIENS
    // ═══════════════════════════════════════════════════════

    public function interviews(Request $request): JsonResponse
    {
        $query = Interview::with(['jobPosting.department', 'application', 'creator', 'evaluations.evaluator']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }
        if ($request->filled('job_posting_id')) {
            $query->where('job_posting_id', $request->get('job_posting_id'));
        }

        $interviews = $query->orderBy('scheduled_at', 'asc')
            ->paginate($request->get('per_page', 15));

        return response()->json($interviews);
    }

    public function storeInterview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'job_posting_id'  => ['required', 'exists:job_postings,id'],
            'application_id'  => ['required', 'exists:job_applications,id'],
            'scheduled_at'    => ['required', 'date'],
            'location'        => ['nullable', 'string', 'max:255'],
            'type'            => ['required', 'in:entretien,test_technique,test_psychotechnique'],
            'notes'           => ['nullable', 'string'],
        ]);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'scheduled';
        $validated['result'] = 'pending';

        $interview = Interview::create($validated);

        JobApplication::where('id', $validated['application_id'])
            ->whereIn('status', ['pre_selected', 'received'])
            ->update(['status' => 'convoked']);

        return response()->json(
            $interview->load('jobPosting', 'application', 'creator'),
            201
        );
    }

    public function updateInterview(Request $request, Interview $interview): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_at' => ['sometimes', 'date'],
            'location'     => ['nullable', 'string', 'max:255'],
            'type'         => ['sometimes', 'in:entretien,test_technique,test_psychotechnique'],
            'status'       => ['sometimes', 'in:scheduled,completed,cancelled'],
            'result'       => ['sometimes', 'in:pending,admitted,rejected'],
            'notes'        => ['nullable', 'string'],
        ]);

        $interview->update($validated);

        if ($request->get('status') === 'completed') {
            JobApplication::where('id', $interview->application_id)
                ->where('status', 'convoked')
                ->update(['status' => 'interviewed']);
        }

        return response()->json($interview->load('jobPosting', 'application', 'creator'));
    }

    public function destroyInterview(Interview $interview): JsonResponse
    {
        if ($interview->status === 'completed') {
            return response()->json(['message' => 'Un entretien terminé ne peut pas être supprimé.'], 422);
        }
        $interview->delete();

        return response()->json(null, 204);
    }

    public function evaluate(Request $request, Interview $interview): JsonResponse
    {
        $request->validate([
            'evaluations'                => ['required', 'array'],
            'evaluations.*.criterion_id' => ['nullable', 'exists:job_posting_criteria,id'],
            'evaluations.*.criterion_name' => ['nullable', 'string', 'max:255'],
            'evaluations.*.score'        => ['required', 'integer', 'min:1', 'max:5'],
            'evaluations.*.comment'      => ['nullable', 'string'],
        ]);

        $evaluatorId = auth()->id();

        InterviewEvaluation::where('interview_id', $interview->id)
            ->where('evaluator_id', $evaluatorId)
            ->delete();

        foreach ($request->get('evaluations') as $ev) {
            InterviewEvaluation::create([
                'interview_id'   => $interview->id,
                'evaluator_id'   => $evaluatorId,
                'criterion_id'   => $ev['criterion_id'] ?? null,
                'criterion_name' => $ev['criterion_name'] ?? null,
                'score'          => $ev['score'],
                'comment'        => $ev['comment'] ?? null,
            ]);
        }

        $avg = InterviewEvaluation::where('interview_id', $interview->id)->avg('score');
        JobApplication::where('id', $interview->application_id)
            ->update(['overall_score' => round($avg, 2)]);

        return response()->json(
            $interview->load('evaluations.evaluator', 'evaluations.criterion')
        );
    }

    // ═══════════════════════════════════════════════════════
    //  STATISTIQUES
    // ═══════════════════════════════════════════════════════

    public function statistics(): JsonResponse
    {
        return response()->json([
            'requests' => [
                'total'       => RecruitmentRequest::count(),
                'draft'       => RecruitmentRequest::where('status', 'draft')->count(),
                'pending_rh'  => RecruitmentRequest::where('status', 'pending_rh')->count(),
                'approved'    => RecruitmentRequest::where('status', 'approved')->count(),
                'in_progress' => RecruitmentRequest::where('status', 'in_progress')->count(),
                'closed'      => RecruitmentRequest::where('status', 'closed')->count(),
            ],
            'postings' => [
                'total'     => JobPosting::count(),
                'draft'     => JobPosting::where('status', 'draft')->count(),
                'published' => JobPosting::where('status', 'published')->count(),
                'closed'    => JobPosting::where('status', 'closed')->count(),
            ],
            'applications' => [
                'total'        => JobApplication::count(),
                'received'     => JobApplication::where('status', 'received')->count(),
                'pre_selected' => JobApplication::where('status', 'pre_selected')->count(),
                'hired'        => JobApplication::where('status', 'hired')->count(),
            ],
            'interviews' => [
                'total'     => Interview::count(),
                'scheduled' => Interview::where('status', 'scheduled')->count(),
                'completed' => Interview::where('status', 'completed')->count(),
            ],
            'by_department' => RecruitmentRequest::selectRaw('department_id, count(*) as total')
                ->with('department:id,name,color')
                ->groupBy('department_id')
                ->get(),
        ]);
    }
}
