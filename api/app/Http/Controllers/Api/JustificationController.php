<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Justification;
use Carbon\Carbon;
use Illuminate\Http\Request;

class JustificationController extends Controller
{
    public function index(Request $request)
    {
        $query = Justification::with(['employee.department', 'employee.position'])
            ->orderByDesc('created_at');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    public function pending()
    {
        $items = Justification::with(['employee.department'])
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($items);
    }

    public function show(Justification $justification)
    {
        return response()->json($justification->load(['employee.department', 'reviewer']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'   => ['required', 'exists:employees,id'],
            'attendance_id' => ['nullable', 'exists:attendances,id'],
            'absence_date'  => ['required', 'date'],
            'absence_type'  => ['nullable', 'string', 'in:maladie,personnel,formation,accident,autre'],
            'reason'        => ['required', 'string', 'max:1000'],
            'document'      => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('justifications', 'public');
        }
        unset($data['document']);

        $justification = Justification::create($data);

        return response()->json($justification->fresh()->load('employee.department'), 201);
    }

    public function approve(Request $request, Justification $justification)
    {
        if ($justification->status !== 'pending') {
            return response()->json(['message' => 'Cette justification a déjà été traitée.'], 422);
        }

        $justification->update([
            'status'       => 'approved',
            'reviewed_by'  => $request->user()->id,
            'reviewed_at'  => Carbon::now(),
            'review_notes' => $request->input('comment'),
        ]);

        return response()->json($justification->fresh()->load('employee.department'));
    }

    public function reject(Request $request, Justification $justification)
    {
        if ($justification->status !== 'pending') {
            return response()->json(['message' => 'Cette justification a déjà été traitée.'], 422);
        }

        $justification->update([
            'status'       => 'rejected',
            'reviewed_by'  => $request->user()->id,
            'reviewed_at'  => Carbon::now(),
            'review_notes' => $request->input('comment'),
        ]);

        return response()->json($justification->fresh()->load('employee.department'));
    }
}
