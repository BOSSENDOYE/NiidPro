<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::with(['assignedEmployee', 'creator'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $tasks = $query->get()->map(fn ($t) => $this->format($t));

        return response()->json($tasks);
    }

    public function show(Task $task)
    {
        return response()->json($this->format($task->load(['assignedEmployee', 'creator'])));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'         => ['required', 'string', 'max:255'],
            'description'   => ['nullable', 'string', 'max:5000'],
            'status'        => ['nullable', 'in:todo,in_progress,done,cancelled'],
            'priority'      => ['nullable', 'in:low,medium,high,urgent'],
            'due_date'      => ['nullable', 'date'],
            'assigned_to'   => ['nullable', 'exists:employees,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        $data['created_by'] = $request->user()->id;
        $data['status']     = $data['status']   ?? 'todo';
        $data['priority']   = $data['priority'] ?? 'medium';

        $task = Task::create($data);

        return response()->json($this->format($task->load(['assignedEmployee', 'creator'])), 201);
    }

    public function update(Request $request, Task $task)
    {
        $data = $request->validate([
            'title'         => ['sometimes', 'string', 'max:255'],
            'description'   => ['nullable', 'string', 'max:5000'],
            'status'        => ['sometimes', 'in:todo,in_progress,done,cancelled'],
            'priority'      => ['sometimes', 'in:low,medium,high,urgent'],
            'due_date'      => ['nullable', 'date'],
            'assigned_to'   => ['nullable', 'exists:employees,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        $task->update($data);

        return response()->json($this->format($task->fresh()->load(['assignedEmployee', 'creator'])));
    }

    public function updateStatus(Request $request, Task $task)
    {
        $data = $request->validate([
            'status' => ['required', 'in:todo,in_progress,done,cancelled'],
        ]);

        $task->update($data);

        return response()->json($this->format($task->fresh()->load(['assignedEmployee', 'creator'])));
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->json(null, 204);
    }

    private function format(Task $task): array
    {
        return [
            'id'          => $task->id,
            'title'       => $task->title,
            'description' => $task->description,
            'status'      => $task->status,
            'priority'    => $task->priority,
            'due_date'    => $task->due_date?->toDateString(),
            'assigned_to' => $task->assigned_to,
            'assignee'    => $task->assignedEmployee ? [
                'id'   => $task->assignedEmployee->id,
                'name' => trim($task->assignedEmployee->first_name . ' ' . $task->assignedEmployee->last_name),
            ] : null,
            'created_by' => $task->created_by,
            'creator'    => $task->creator ? [
                'id'   => $task->creator->id,
                'name' => $task->creator->name,
            ] : null,
            'created_at' => $task->created_at,
            'updated_at' => $task->updated_at,
        ];
    }
}
