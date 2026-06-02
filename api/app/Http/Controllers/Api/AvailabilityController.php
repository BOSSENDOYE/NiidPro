<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Availability;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    public function index(Request $request)
    {
        $query = Availability::with('employee')
            ->orderBy('start_date', 'desc');

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

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'type'        => 'required|in:remote,mission,training,secondment,personal,suspension',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'sometimes|in:pending,approved,active,ended,cancelled',
            'approved_by' => 'nullable|string|max:255',
        ]);

        $availability = Availability::create($data);

        return response()->json($availability->load('employee'), 201);
    }

    public function show(Availability $availability)
    {
        return response()->json($availability->load('employee'));
    }

    public function update(Request $request, Availability $availability)
    {
        $data = $request->validate([
            'employee_id' => 'sometimes|exists:employees,id',
            'type'        => 'sometimes|in:remote,mission,training,secondment,personal,suspension',
            'start_date'  => 'sometimes|date',
            'end_date'    => 'sometimes|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'sometimes|in:pending,approved,active,ended,cancelled',
            'approved_by' => 'nullable|string|max:255',
        ]);

        $availability->update($data);

        return response()->json($availability->load('employee'));
    }

    public function approve(Availability $availability)
    {
        $availability->update(['status' => 'approved']);

        return response()->json($availability->load('employee'));
    }

    public function destroy(Availability $availability)
    {
        $availability->delete();

        return response()->json(null, 204);
    }
}
