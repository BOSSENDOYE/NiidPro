<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /** Nombre d'utilisateurs par rôle (sans dépendre de la relation Spatie users()). */
    private function roleCounts(): \Illuminate\Support\Collection
    {
        return DB::table('model_has_roles')
            ->select('role_id', DB::raw('count(*) as c'))
            ->groupBy('role_id')
            ->pluck('c', 'role_id');
    }

    /** Liste des rôles avec leurs permissions + catalogue groupé par module. */
    public function index()
    {
        $counts = $this->roleCounts();

        $roles = Role::with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $r) => [
                'id'          => $r->id,
                'name'        => $r->name,
                'users_count' => (int) ($counts[$r->id] ?? 0),
                'permissions' => $r->permissions->pluck('name'),
            ]);

        // Catalogue groupé depuis config/permissions.php
        // Seules les permissions réellement en base sont incluses (cohérence après migrations)
        $inDb = Permission::pluck('name')->flip();
        $modules = collect(config('permissions'))->map(fn ($module) => [
            'label' => $module['label'],
            'icon'  => $module['icon'],
            'perms' => collect($module['perms'])
                ->filter(fn ($label, $key) => $inDb->has($key))
                ->map(fn ($label, $key) => ['name' => $key, 'label' => $label])
                ->values(),
        ])->filter(fn ($m) => $m['perms']->isNotEmpty())->values();

        return response()->json([
            'roles'   => $roles,
            'modules' => $modules,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        return response()->json($this->format($role->fresh('permissions')), 201);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);

        return response()->json($this->format($role->fresh('permissions')));
    }

    public function destroy(Role $role)
    {
        $count = (int) ($this->roleCounts()[$role->id] ?? 0);
        if ($count > 0) {
            return response()->json(['message' => 'Ce rôle est attribué à des utilisateurs.'], 422);
        }
        $role->delete();
        return response()->json(null, 204);
    }

    private function format(Role $r): array
    {
        return [
            'id'          => $r->id,
            'name'        => $r->name,
            'users_count' => (int) ($this->roleCounts()[$r->id] ?? 0),
            'permissions' => $r->permissions->pluck('name'),
        ];
    }
}
