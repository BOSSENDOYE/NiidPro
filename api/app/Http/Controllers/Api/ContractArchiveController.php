<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContractArchive;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContractArchiveController extends Controller
{
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
            'files'       => ['required', 'array', 'min:1'],
            'files.*'     => ['required', 'file', 'max:51200'], // 50 MB max par fichier
            'employee_id' => ['nullable', 'exists:employees,id'],
            'label'       => ['nullable', 'string', 'max:255'],
        ]);

        $saved = [];

        foreach ($request->file('files') as $file) {
            $path = $file->store('contract-archives', 'public');

            $archive = ContractArchive::create([
                'employee_id'   => $request->employee_id,
                'original_name' => $file->getClientOriginalName(),
                'file_path'     => $path,
                'file_size'     => $file->getSize(),
                'mime_type'     => $file->getMimeType(),
                'label'         => $request->label,
                'uploaded_by'   => $request->user()->id,
            ]);

            $saved[] = $this->format($archive->load(['employee', 'uploader']));
        }

        return response()->json($saved, 201);
    }

    public function download(ContractArchive $contractArchive)
    {
        if (!Storage::disk('public')->exists($contractArchive->file_path)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('public')->download(
            $contractArchive->file_path,
            $contractArchive->original_name
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
