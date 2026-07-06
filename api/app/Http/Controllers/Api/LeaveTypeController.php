<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use Illuminate\Http\Request;

class LeaveTypeController extends Controller
{
    public function index()
    {
        return response()->json(
            LeaveType::orderByRaw("FIELD(category,'Congés','Autorisations spéciales','Service','Représentation','Autres')")
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                   => ['required', 'string', 'max:150', 'unique:leave_types'],
            'code'                   => ['required', 'string', 'max:30',  'unique:leave_types'],
            'category'               => ['nullable', 'string', 'max:50'],
            'color'                  => ['nullable', 'string', 'max:20'],
            'requires_justification' => ['boolean'],
            'paid'                   => ['boolean'],
            'max_days_per_year'      => ['nullable', 'integer', 'min:1'],
            'is_active'              => ['boolean'],
        ]);

        return response()->json(LeaveType::create($data), 201);
    }

    public function update(Request $request, LeaveType $leaveType)
    {
        $data = $request->validate([
            'name'                   => ['sometimes', 'string', 'max:150', 'unique:leave_types,name,' . $leaveType->id],
            'code'                   => ['sometimes', 'string', 'max:30',  'unique:leave_types,code,' . $leaveType->id],
            'category'               => ['nullable', 'string', 'max:50'],
            'color'                  => ['nullable', 'string', 'max:20'],
            'requires_justification' => ['boolean'],
            'paid'                   => ['boolean'],
            'max_days_per_year'      => ['nullable', 'integer', 'min:1'],
            'is_active'              => ['boolean'],
        ]);

        $leaveType->update($data);
        return response()->json($leaveType->fresh());
    }

    public function destroy(LeaveType $leaveType)
    {
        if ($leaveType->leaves()->exists()) {
            return response()->json(
                ['message' => 'Ce type est utilisé par des congés existants et ne peut pas être supprimé.'],
                422
            );
        }

        $leaveType->delete();
        return response()->json(['message' => 'Type de congé supprimé.']);
    }
}
