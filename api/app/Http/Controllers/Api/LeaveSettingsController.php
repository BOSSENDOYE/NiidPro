<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(LeaveSettings::get());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'annual_quota'             => ['required', 'integer', 'min:1', 'max:365'],
            'min_jours_obligatoires'   => ['integer', 'min:0', 'max:30'],
            'report_annees_max'        => ['integer', 'min:1', 'max:5'],
            'samedi_ouvrable'          => ['boolean'],
            'mere_famille_age_max'     => ['integer', 'min:1', 'max:21'],
            'mere_famille_jours_enfant'=> ['integer', 'min:0', 'max:10'],
        ]);

        $settings = LeaveSettings::get();
        $settings->update($validated);

        return response()->json($settings->fresh());
    }
}
