<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\Employee;
use Illuminate\Http\Request;

class ContractController extends Controller
{
    public function index(Request $request)
    {
        $query = Contract::with(['employee.department'])
            ->when($request->employee_id, fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->type, fn($q, $t) => $q->where('type', $t))
            ->when($request->is_active !== null, fn($q) => $q->where('is_active', $request->boolean('is_active')));

        return response()->json($query->orderByDesc('start_date')->get());
    }

    public function expiringSoon(Request $request)
    {
        $days = $request->days ?? 30;
        $contracts = Contract::with(['employee.department'])
            ->where('is_active', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<=', now()->addDays($days))
            ->whereDate('end_date', '>=', now())
            ->orderBy('end_date')
            ->get();

        return response()->json($contracts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'            => ['required', 'exists:employees,id'],
            'type'                   => ['required', 'in:CDI,CDD,DECRET,DETACHEMENT,Stage,Alternance,Prestation,Autre'],
            'start_date'             => ['required', 'date'],
            'end_date'               => ['nullable', 'date', 'after:start_date'],
            'trial_period_end'       => ['nullable', 'date'],
            'salary'                 => ['nullable', 'numeric', 'min:0'],
            'working_hours_per_week' => ['nullable', 'integer', 'min:1', 'max:60'],
            'notes'                  => ['nullable', 'string'],
        ]);

        // Deactivate previous active contracts if needed for CDI
        if ($data['type'] === 'CDI') {
            Contract::where('employee_id', $data['employee_id'])
                ->where('is_active', true)
                ->update(['is_active' => false]);
        }

        $data['is_active'] = true;
        $contract = Contract::create($data);

        return response()->json($contract->load('employee'), 201);
    }

    public function show(Contract $contract)
    {
        return response()->json($contract->load('employee.department'));
    }

    public function update(Request $request, Contract $contract)
    {
        $data = $request->validate([
            'type'                   => ['sometimes', 'in:CDI,CDD,DECRET,DETACHEMENT,Stage,Alternance,Prestation,Autre'],
            'start_date'             => ['sometimes', 'date'],
            'end_date'               => ['nullable', 'date'],
            'trial_period_end'       => ['nullable', 'date'],
            'salary'                 => ['nullable', 'numeric', 'min:0'],
            'working_hours_per_week' => ['nullable', 'integer'],
            'notes'                  => ['nullable', 'string'],
            'is_active'              => ['sometimes', 'boolean'],
        ]);

        $contract->update($data);

        return response()->json($contract->fresh()->load('employee'));
    }

    public function destroy(Contract $contract)
    {
        $contract->delete();
        return response()->json(['message' => 'Contrat supprimé.']);
    }
}
