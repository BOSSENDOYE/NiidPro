<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\Employee;
use App\Models\GeneratedDocument;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    // ─── Templates ────────────────────────────────────────────────

    public function templates(Request $request)
    {
        $query = DocumentTemplate::withCount('generatedDocuments')
            ->with('creator')
            ->when($request->type,   fn($q, $t) => $q->where('type', $t))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"));

        return response()->json($query->latest()->get());
    }

    public function storeTemplate(Request $request)
    {
        $data = $request->validate([
            'type'        => ['required', 'in:attestation,note_service'],
            'name'        => ['required', 'string', 'max:255'],
            'content'     => ['required', 'string'],
            'description' => ['nullable', 'string', 'max:500'],
            'settings'    => ['nullable', 'array'],
        ]);

        $data['created_by'] = $request->user()->id;
        $template = DocumentTemplate::create($data);

        return response()->json($template->load('creator'), 201);
    }

    public function showTemplate(DocumentTemplate $template)
    {
        return response()->json(
            $template->load('creator')->loadCount('generatedDocuments')
        );
    }

    public function updateTemplate(Request $request, DocumentTemplate $template)
    {
        $data = $request->validate([
            'type'        => ['sometimes', 'in:attestation,note_service'],
            'name'        => ['sometimes', 'string', 'max:255'],
            'content'     => ['sometimes', 'string'],
            'description' => ['nullable', 'string', 'max:500'],
            'status'      => ['sometimes', 'in:active,archived'],
            'settings'    => ['nullable', 'array'],
        ]);

        $template->update($data);

        return response()->json($template->fresh()->load('creator'));
    }

    public function destroyTemplate(DocumentTemplate $template)
    {
        $template->delete();
        return response()->json(['message' => 'Modèle supprimé.']);
    }

    // ─── Generate ─────────────────────────────────────────────────

    public function generate(Request $request)
    {
        $data = $request->validate([
            'template_id'      => ['required', 'exists:document_templates,id'],
            'employee_ids'     => ['required', 'array', 'min:1'],
            'employee_ids.*'   => ['exists:employees,id'],
            'custom_variables' => ['nullable', 'array'],
        ]);

        $template  = DocumentTemplate::findOrFail($data['template_id']);
        $employees = Employee::with(['department', 'position'])
            ->whereIn('id', $data['employee_ids'])
            ->get();

        $documents = [];

        $customVars = $data['custom_variables'] ?? [];

        foreach ($employees as $employee) {
            $reference    = $this->generateReference($template->type);
            $contentFinal = $this->substituteVariables($template->content, $employee, $reference, $customVars);

            $doc = GeneratedDocument::create([
                'template_id'   => $template->id,
                'employee_id'   => $employee->id,
                'type'          => $template->type,
                'reference'     => $reference,
                'content_final' => $contentFinal,
                'generated_by'  => $request->user()->id,
            ]);

            $documents[] = $doc->load(['employee.department', 'template']);
        }

        return response()->json([
            'documents' => $documents,
            'count'     => count($documents),
        ], 201);
    }

    // ─── Generated Documents ──────────────────────────────────────

    public function generated(Request $request)
    {
        $query = GeneratedDocument::with(['employee.department', 'template', 'generator'])
            ->when($request->type,        fn($q, $t) => $q->where('type', $t))
            ->when($request->employee_id, fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->template_id, fn($q, $t) => $q->where('template_id', $t))
            ->when($request->search,      fn($q, $s) =>
                $q->where('reference', 'like', "%{$s}%")
                  ->orWhereHas('employee', fn($eq) =>
                      $eq->where('last_name', 'like', "%{$s}%")
                         ->orWhere('first_name', 'like', "%{$s}%")
                         ->orWhere('employee_number', 'like', "%{$s}%")
                  )
            );

        return response()->json($query->latest()->paginate(20));
    }

    public function showGenerated(GeneratedDocument $document)
    {
        return response()->json(
            $document->load(['employee.department', 'template', 'generator'])
        );
    }

    public function destroyGenerated(GeneratedDocument $document)
    {
        $document->delete();
        return response()->json(['message' => 'Document supprimé.']);
    }

    // ─── Private Helpers ──────────────────────────────────────────

    private function generateReference(string $type): string
    {
        $prefix = $type === 'attestation' ? 'ATT' : 'NS';
        $year   = now()->format('Y');
        $count  = GeneratedDocument::where('type', $type)
            ->whereYear('created_at', $year)
            ->withTrashed()
            ->count() + 1;

        return sprintf('%s-%s-%04d', $prefix, $year, $count);
    }

    private function substituteVariables(string $content, Employee $employee, string $reference, array $customVars = []): string
    {
        $map = [
            '{NOM_AGENT}'           => $employee->last_name         ?? '',
            '{PRENOM_AGENT}'        => $employee->first_name        ?? '',
            '{NOM_COMPLET}'         => $employee->full_name         ?? '',
            '{MATRICULE}'           => $employee->employee_number   ?? '',
            '{FONCTION}'            => $employee->position?->title  ?? '',
            '{DIRECTION}'           => $employee->department?->name ?? '',
            '{DATE_ENTREE_SERVICE}' => $employee->hire_date?->format('d/m/Y')  ?? '',
            '{DATE_NAISSANCE}'      => $employee->birth_date?->format('d/m/Y') ?? '',
            '{LIEU_NAISSANCE}'      => $employee->birth_place       ?? '',
            '{NATIONALITE}'         => $employee->nationality       ?? '',
            '{EMAIL_PROFESSIONNEL}' => $employee->professional_email ?? '',
            '{TELEPHONE}'           => $employee->phone_professional ?? $employee->phone_personal ?? '',
            '{DATE_GENERATION}'     => now()->format('d/m/Y'),
            '{ANNEE_EN_COURS}'      => now()->format('Y'),
            '{NUMERO_DOCUMENT}'     => $reference,
        ];

        // Merge custom variables (user-defined, filled during generation)
        foreach ($customVars as $key => $value) {
            $formattedKey = str_starts_with($key, '{') ? $key : "{{$key}}";
            $map[$formattedKey] = (string) $value;
        }

        return str_replace(array_keys($map), array_values($map), $content);
    }
}
