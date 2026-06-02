<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sanction;
use Illuminate\Http\Request;

class SanctionController extends Controller
{
    public function index(Request $request)
    {
        $query = Sanction::with(['employee.department', 'employee.position'])
            ->orderByDesc('sanction_date');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    public function show(Sanction $sanction)
    {
        return response()->json($sanction->load('employee.department'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'   => ['required', 'exists:employees,id'],
            'type'          => ['required', 'in:avertissement,blame,mise_a_pied,retrogradation,licenciement,autre'],
            'reason'        => ['required', 'string', 'max:2000'],
            'sanction_date' => ['required', 'date'],
            'start_date'    => ['nullable', 'date'],
            'end_date'      => ['nullable', 'date', 'after_or_equal:start_date'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'decided_by'    => ['nullable', 'string', 'max:255'],
            'reference'     => ['nullable', 'string', 'max:100'],
            'status'        => ['nullable', 'in:active,lifted'],
            'notes'         => ['nullable', 'string', 'max:2000'],
            'document'      => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('sanctions', 'public');
        }
        unset($data['document']);

        $sanction = Sanction::create($data);

        return response()->json($sanction->fresh()->load('employee.department'), 201);
    }

    public function update(Request $request, Sanction $sanction)
    {
        $data = $request->validate([
            'employee_id'   => ['sometimes', 'exists:employees,id'],
            'type'          => ['sometimes', 'in:avertissement,blame,mise_a_pied,retrogradation,licenciement,autre'],
            'reason'        => ['sometimes', 'string', 'max:2000'],
            'sanction_date' => ['sometimes', 'date'],
            'start_date'    => ['nullable', 'date'],
            'end_date'      => ['nullable', 'date'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'decided_by'    => ['nullable', 'string', 'max:255'],
            'reference'     => ['nullable', 'string', 'max:100'],
            'status'        => ['nullable', 'in:active,lifted'],
            'notes'         => ['nullable', 'string', 'max:2000'],
            'document'      => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('sanctions', 'public');
        }
        unset($data['document']);

        $sanction->update($data);

        return response()->json($sanction->fresh()->load('employee.department'));
    }

    public function destroy(Sanction $sanction)
    {
        $sanction->delete();
        return response()->json(null, 204);
    }
}
