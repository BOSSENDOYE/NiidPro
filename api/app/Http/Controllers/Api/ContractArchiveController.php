<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContractArchive;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ContractArchiveController extends Controller
{
    /** Types de contrat reconnus dans les noms de fichiers */
    private const KNOWN_TYPES = [
        'CDI', 'CDD', 'DECRET', 'DETACHEMENT', 'STAGE',
        'ALTERNANCE', 'PRESTATION', 'CONTRAT', 'AVENANT', 'AUTRE',
    ];

    public function index(Request $request)
    {
        $query = ContractArchive::with(['employee', 'uploader'])
            ->orderByDesc('created_at');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('search')) {
            $query->where('original_name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->get()->map(fn($a) => $this->format($a)));
    }

    public function store(Request $request)
    {
        $request->validate([
            'files'          => ['required', 'array', 'min:1'],
            'files.*'        => ['required', 'file', 'max:51200'], // 50 MB max par fichier
            'employee_id'    => ['nullable', 'exists:employees,id'],
            'label'          => ['nullable', 'string', 'max:255'],
            // Rattachement par fichier (parallèle à files[]) — prioritaire si fourni
            'employee_ids'   => ['nullable', 'array'],
            'labels'         => ['nullable', 'array'],
        ]);

        $employeeIds = $request->input('employee_ids', []);
        $labels      = $request->input('labels', []);

        $ids = [];

        foreach ($request->file('files') as $i => $file) {
            $path = $file->store('contract-archives', 'public');

            // Agent / libellé spécifiques au fichier, sinon valeur globale
            $empId = $employeeIds[$i] ?? $request->employee_id;
            $empId = $empId !== '' && $empId !== null ? (int) $empId : null;
            $label = $labels[$i] ?? $request->label;
            $label = $label !== '' ? $label : null;

            $archive = ContractArchive::create([
                'employee_id'   => $empId,
                'original_name' => $file->getClientOriginalName(),
                'file_path'     => $path,
                'file_size'     => $file->getSize(),
                // En-tête HTTP du navigateur : pas de relecture disque (rapide)
                'mime_type'     => $file->getClientMimeType(),
                'label'         => $label,
                'uploaded_by'   => $request->user()->id,
            ]);

            $ids[] = $archive->id;
        }

        // Chargement des relations en une seule requête groupée
        $saved = ContractArchive::with(['employee', 'uploader'])
            ->whereIn('id', $ids)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($a) => $this->format($a));

        return response()->json($saved, 201);
    }

    public function preview(ContractArchive $contractArchive)
    {
        if (!Storage::disk('public')->exists($contractArchive->file_path)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('public')->response(
            $contractArchive->file_path,
            null,
            [],
            'inline'
        );
    }

    /**
     * Analyse une liste de noms de fichiers et propose, pour chacun, le type de
     * contrat détecté et l'agent correspondant (rattachement automatique).
     *
     * Convention : "<TYPE> <NOM DE L'AGENT>"  ex. "CDI NDIOBA FALL.pdf"
     */
    public function match(Request $request): JsonResponse
    {
        $data = $request->validate([
            'filenames'   => ['required', 'array', 'min:1'],
            'filenames.*' => ['string'],
        ]);

        // Index des agents : tokens triés du "prénom + nom"
        $employees = Employee::select('id', 'first_name', 'last_name', 'employee_number')
            ->get()
            ->map(fn ($e) => [
                'model'  => $e,
                'tokens' => $this->nameTokens($e->first_name . ' ' . $e->last_name),
            ]);

        $results = [];

        foreach ($data['filenames'] as $filename) {
            $base  = pathinfo($filename, PATHINFO_FILENAME);
            $parts = preg_split('/[\s_\-]+/', trim($base)) ?: [];

            // Détection du type = 1er mot s'il est connu
            $type = null;
            if (!empty($parts)) {
                $firstUpper = strtoupper($this->normalizeToken($parts[0]));
                if (in_array($firstUpper, self::KNOWN_TYPES, true)) {
                    $type = $firstUpper;
                    array_shift($parts);
                }
            }

            $fileTokens = $this->nameTokens(implode(' ', $parts));
            $matches    = $employees->filter(fn ($x) => $x['tokens'] === $fileTokens && !empty($fileTokens))->values();

            $count  = $matches->count();
            $status = $count === 1 ? 'matched' : ($count > 1 ? 'ambiguous' : 'none');
            $emp    = $count === 1 ? $matches[0]['model'] : null;

            $results[] = [
                'filename'        => $filename,
                'type'            => $type,
                'status'          => $status,
                'employee_id'     => $emp?->id,
                'employee_name'   => $emp ? trim($emp->first_name . ' ' . $emp->last_name) : null,
                'employee_number' => $emp?->employee_number,
                'candidates'      => $count > 1
                    ? $matches->map(fn ($x) => [
                        'id'   => $x['model']->id,
                        'name' => trim($x['model']->first_name . ' ' . $x['model']->last_name),
                    ])->all()
                    : [],
            ];
        }

        return response()->json($results);
    }

    /** Normalise un mot : sans accents, majuscules, alphanumérique uniquement */
    private function normalizeToken(string $s): string
    {
        $s = Str::ascii($s);
        $s = strtoupper($s);
        return preg_replace('/[^A-Z0-9]/', '', $s) ?? '';
    }

    /** Découpe un nom en tokens normalisés triés (comparaison sans tenir compte de l'ordre) */
    private function nameTokens(string $name): array
    {
        $parts  = preg_split('/[\s_\-]+/', trim($name)) ?: [];
        $tokens = [];
        foreach ($parts as $p) {
            $t = $this->normalizeToken($p);
            if ($t !== '') {
                $tokens[] = $t;
            }
        }
        sort($tokens);
        return $tokens;
    }

    public function download(ContractArchive $contractArchive)
    {
        if (!Storage::disk('public')->exists($contractArchive->file_path)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('public')->response(
            $contractArchive->file_path,
            null,
            [],
            'inline'
        );
    }

    public function destroy(ContractArchive $contractArchive)
    {
        Storage::disk('public')->delete($contractArchive->file_path);
        $contractArchive->delete();
        return response()->json(null, 204);
    }

    private function format(ContractArchive $a): array
    {
        return [
            'id'            => $a->id,
            'original_name' => $a->original_name,
            'file_path'     => $a->file_path,
            'file_url'      => Storage::disk('public')->url($a->file_path),
            'file_size'     => $a->file_size,
            'mime_type'     => $a->mime_type,
            'label'         => $a->label,
            'employee_id'   => $a->employee_id,
            'employee'      => $a->employee ? [
                'id'   => $a->employee->id,
                'name' => trim($a->employee->first_name . ' ' . $a->employee->last_name),
                'number' => $a->employee->employee_number,
            ] : null,
            'uploaded_by'   => $a->uploaded_by,
            'uploader'      => $a->uploader ? ['id' => $a->uploader->id, 'name' => $a->uploader->name] : null,
            'created_at'    => $a->created_at,
        ];
    }
}
