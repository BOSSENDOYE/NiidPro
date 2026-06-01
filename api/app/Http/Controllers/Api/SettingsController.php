<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class SettingsController extends Controller
{
    public function index()
    {
        return response()->json([
            'company_name' => env('COMPANY_NAME', config('app.name')),
        ]);
    }
}
