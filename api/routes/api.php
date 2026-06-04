<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\ContractArchiveController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\JustificationController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\SanctionController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn () => response()->json(['status' => 'ok', 'app' => 'NiidPro API v1']));

// Paramètres publics (nom entreprise, etc.)
Route::get('/settings', [SettingsController::class, 'index']);

// Auth routes (public)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'changePassword']);
    });

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Departments
    Route::apiResource('departments', DepartmentController::class);

    // Employees
    Route::post('/employees/{employee}/photo', [EmployeeController::class, 'uploadPhoto']);
    Route::apiResource('employees', EmployeeController::class);

    // Contracts
    Route::get('/contracts/expiring', [ContractController::class, 'expiringSoon']);
    Route::apiResource('contracts', ContractController::class);

    // Contract Archives
    Route::get('/contract-archives/{contractArchive}/download', [ContractArchiveController::class, 'download']);
    Route::apiResource('contract-archives', ContractArchiveController::class)->only(['index', 'store', 'destroy']);

    // Attendance
    Route::get('/attendances/today', [AttendanceController::class, 'today']);
    Route::post('/attendances/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendances/check-out', [AttendanceController::class, 'checkOut']);
    Route::post('/attendances/badge', [AttendanceController::class, 'badge']);
    Route::apiResource('attendances', AttendanceController::class)->only(['index', 'store']);

    // Leaves — routes nommées avant apiResource
    Route::get('/leaves/pending',                [LeaveController::class, 'pending']);
    Route::get('/leaves/types',                  [LeaveController::class, 'types']);
    Route::get('/leaves/holidays',               [LeaveController::class, 'holidays']);
    Route::get('/leaves/planning',               [LeaveController::class, 'plannings']);
    Route::get('/leaves/balance/{employee}',     [LeaveController::class, 'balance']);
    Route::post('/leaves/calculate-days',        [LeaveController::class, 'calculateDays']);
    Route::post('/leaves/planning/generate',     [LeaveController::class, 'generatePlanning']);
    Route::post('/leaves/{leave}/approve',       [LeaveController::class, 'approve']);
    Route::post('/leaves/{leave}/reject',        [LeaveController::class, 'reject']);
    Route::post('/leaves/{leave}/justification', [LeaveController::class, 'submitJustification']);
    Route::apiResource('leaves', LeaveController::class);

    // Justifications
    Route::get('/justifications/pending', [JustificationController::class, 'pending']);
    Route::post('/justifications/{justification}/approve', [JustificationController::class, 'approve']);
    Route::post('/justifications/{justification}/reject',  [JustificationController::class, 'reject']);
    Route::apiResource('justifications', JustificationController::class)->only(['index', 'show', 'store']);

    // Sanctions
    Route::apiResource('sanctions', SanctionController::class);

    // Availabilities
    Route::patch('/availabilities/{availability}/approve', [AvailabilityController::class, 'approve']);
    Route::apiResource('availabilities', AvailabilityController::class);

    // Tasks
    Route::patch('/tasks/{task}/status', [TaskController::class, 'updateStatus']);
    Route::apiResource('tasks', TaskController::class);

    // Documents de service
    Route::prefix('documents')->group(function () {
        Route::get('/templates',               [DocumentController::class, 'templates']);
        Route::post('/templates',              [DocumentController::class, 'storeTemplate']);
        Route::get('/templates/{template}',    [DocumentController::class, 'showTemplate']);
        Route::put('/templates/{template}',    [DocumentController::class, 'updateTemplate']);
        Route::delete('/templates/{template}', [DocumentController::class, 'destroyTemplate']);
        Route::post('/generate',               [DocumentController::class, 'generate']);
        Route::get('/generated',               [DocumentController::class, 'generated']);
        Route::get('/generated/{document}',    [DocumentController::class, 'showGenerated']);
        Route::delete('/generated/{document}', [DocumentController::class, 'destroyGenerated']);
    });
});
