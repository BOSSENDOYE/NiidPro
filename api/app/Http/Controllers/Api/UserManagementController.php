<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index()
    {
        $users = User::with('employee:id,user_id,photo,first_name,last_name')
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => $this->format($u));

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'  => ['required', 'string', 'min:6'],
            'role'      => ['nullable', 'string', 'exists:roles,name'],
            'is_active' => ['boolean'],
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
        ]);

        if (!empty($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        return response()->json($this->format($user->fresh()), 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password'  => ['nullable', 'string', 'min:6'],
            'role'      => ['nullable', 'string', 'exists:roles,name'],
            'is_active' => ['boolean'],
        ]);

        $user->name      = $data['name'];
        $user->email     = $data['email'];
        $user->is_active = $data['is_active'] ?? $user->is_active;
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        if (array_key_exists('role', $data)) {
            $user->syncRoles($data['role'] ? [$data['role']] : []);
        }

        return response()->json($this->format($user->fresh()));
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }
        $user->delete();
        return response()->json(null, 204);
    }

    private function format(User $u): array
    {
        return [
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            'is_active'  => (bool) $u->is_active,
            'roles'      => $u->getRoleNames(),
            'role'       => $u->getRoleNames()->first(),
            'photo_url'  => $u->employee?->photo_url,
            'last_login_at' => $u->last_login_at,
            'created_at' => $u->created_at,
        ];
    }
}
