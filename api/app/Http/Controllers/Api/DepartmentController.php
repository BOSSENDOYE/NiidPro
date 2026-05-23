<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index()
    {
        return response()->json(
            Department::with(['parent', 'manager', 'children'])
                ->withCount(['employees' => fn($q) => $q->where('status', 'active')])
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'code'        => ['nullable', 'string', 'unique:departments'],
            'description' => ['nullable', 'string'],
            'parent_id'   => ['nullable', 'exists:departments,id'],
            'manager_id'  => ['nullable', 'exists:employees,id'],
            'color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        return response()->json(Department::create($data), 201);
    }

    public function show(Department $department)
    {
        return response()->json(
            $department->load(['parent', 'manager', 'children', 'employees.position'])
        );
    }

    public function update(Request $request, Department $department)
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:100'],
            'code'        => ['nullable', 'string', 'unique:departments,code,' . $department->id],
            'description' => ['nullable', 'string'],
            'parent_id'   => ['nullable', 'exists:departments,id'],
            'manager_id'  => ['nullable', 'exists:employees,id'],
            'color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $department->update($data);
        return response()->json($department->fresh());
    }

    public function destroy(Department $department)
    {
        $department->delete();
        return response()->json(['message' => 'Direction supprimée.']);
    }
}
