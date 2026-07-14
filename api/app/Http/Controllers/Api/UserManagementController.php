<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index()
    {
        $users = User::with([
            'linkedEmployee:id,first_name,last_name,employee_number,photo',
            'department:id,name',
        ])
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => $this->format($u));

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:6'],
            'role'          => ['nullable', 'string', 'exists:roles,name'],
            'is_active'     => ['boolean'],
            'employee_id'   => ['nullable', 'exists:employees,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        $user = User::create([
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password'      => Hash::make($data['password']),
            'is_active'     => $data['is_active'] ?? true,
            'employee_id'   => $data['employee_id'] ?? null,
            'department_id' => $data['department_id'] ?? null,
        ]);

        if (!empty($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        // Lier l'employee au user si sélectionné
        if (!empty($data['employee_id'])) {
            Employee::where('id', $data['employee_id'])
                ->update(['user_id' => $user->id]);
        }

        return response()->json($this->format($user->fresh(['linkedEmployee', 'department'])), 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password'      => ['nullable', 'string', 'min:6'],
            'role'          => ['nullable', 'string', 'exists:roles,name'],
            'is_active'     => ['boolean'],
            'employee_id'   => ['nullable', 'exists:employees,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        // Délier l'ancien employee si on change
        $oldEmployeeId = $user->employee_id;
        $newEmployeeId = $data['employee_id'] ?? null;

        if ($oldEmployeeId && $oldEmployeeId !== $newEmployeeId) {
            Employee::where('id', $oldEmployeeId)->update(['user_id' => null]);
        }

        $user->name          = $data['name'];
        $user->email         = $data['email'];
        $user->is_active     = $data['is_active'] ?? $user->is_active;
        $user->employee_id   = $newEmployeeId;
        $user->department_id = $data['department_id'] ?? null;

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        if (array_key_exists('role', $data)) {
            $user->syncRoles($data['role'] ? [$data['role']] : []);
        }

        // Lier le nouvel employee
        if ($newEmployeeId) {
            Employee::where('id', $newEmployeeId)->update(['user_id' => $user->id]);
        }

        return response()->json($this->format($user->fresh(['linkedEmployee', 'department'])));
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }
        // Délier l'employee si lié
        if ($user->employee_id) {
            Employee::where('id', $user->employee_id)->update(['user_id' => null]);
        }
        $user->delete();
        return response()->json(null, 204);
    }

    private function format(User $u): array
    {
        $emp = $u->linkedEmployee;
        return [
            'id'            => $u->id,
            'name'          => $u->name,
            'email'         => $u->email,
            'is_active'     => (bool) $u->is_active,
            'roles'         => $u->getRoleNames(),
            'role'          => $u->getRoleNames()->first(),
            'photo_url'     => $emp?->photo_url ?? null,
            'employee_id'   => $u->employee_id,
            'employee_name' => $emp ? "{$emp->first_name} {$emp->last_name}" : null,
            'employee_number' => $emp?->employee_number,
            'department_id' => $u->department_id,
            'department_name' => $u->department?->name,
            'last_login_at' => $u->last_login_at,
            'created_at'    => $u->created_at,
        ];
    }
}
