<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\OrganisationUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganisationUnitController extends Controller
{
    /** GET /api/organisation-units — liste plate avec nb agents par unité */
    public function index(): JsonResponse
    {
        $units = OrganisationUnit::orderBy('niveau')->orderBy('ordre')->get();

        // Compte des agents par code de direction (jointure sur departments.name)
        $agentsByDept = DB::table('employees')
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->whereNull('employees.termination_date')
            ->where('employees.status', 'active')
            ->select('departments.name', DB::raw('count(*) as cnt'))
            ->groupBy('departments.name')
            ->pluck('cnt', 'name');

        $units->each(function ($unit) use ($agentsByDept) {
            // Correspondance souple sur le libellé ou le code
            $cnt = $agentsByDept->first(function ($v, $k) use ($unit) {
                return str_contains(strtolower($k), strtolower($unit->code))
                    || str_contains(strtolower($unit->libelle), strtolower($k));
            }, 0);
            $unit->nb_agents = (int) $cnt;
        });

        return response()->json($units);
    }

    /** POST /api/organisation-units */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'required|string|max:30|unique:organisation_units,code',
            'libelle'   => 'required|string|max:200',
            'type'      => 'required|in:gouvernance,appui,cellule,direction,division',
            'niveau'    => 'required|integer|min:0|max:5',
            'parent_id' => 'nullable|integer|exists:organisation_units,id',
            'ordre'     => 'nullable|integer|min:0',
        ]);

        $unit = OrganisationUnit::create([
            ...$data,
            'ordre' => $data['ordre'] ?? OrganisationUnit::where('parent_id', $data['parent_id'] ?? null)->count(),
        ]);

        return response()->json($unit, 201);
    }

    /** PUT /api/organisation-units/{id} */
    public function update(Request $request, OrganisationUnit $organisationUnit): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'sometimes|string|max:30|unique:organisation_units,code,' . $organisationUnit->id,
            'libelle'   => 'sometimes|string|max:200',
            'type'      => 'sometimes|in:gouvernance,appui,cellule,direction,division',
            'parent_id' => 'nullable|integer|exists:organisation_units,id',
            'ordre'     => 'nullable|integer|min:0',
        ]);

        $organisationUnit->update($data);

        return response()->json($organisationUnit->fresh());
    }

    /** DELETE /api/organisation-units/{id} */
    public function destroy(OrganisationUnit $organisationUnit): JsonResponse
    {
        if ($organisationUnit->children()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une unité qui a des sous-entités.'], 422);
        }

        $organisationUnit->delete();

        return response()->json(['message' => "Unité \"{$organisationUnit->libelle}\" supprimée."]);
    }

    /** POST /api/organisation-units/seed — recharge les données officielles */
    public function seed(): JsonResponse
    {
        \Artisan::call('db:seed', ['--class' => 'OrganisationUnitSeeder', '--force' => true]);

        return response()->json(['message' => 'Structure organisationnelle rechargée.']);
    }
}
