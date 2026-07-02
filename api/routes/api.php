<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\ContractArchiveController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\JustificationController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\SanctionController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\MailSettingController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\RecruitmentController;
use App\Http\Controllers\Api\RecruitmentParamsController;
use App\Http\Controllers\Api\PlanRecrutementController;
use App\Http\Controllers\Api\PlanFormationController;
use App\Http\Controllers\Api\EvaluationController;
use App\Http\Controllers\Api\CarriereController;
use App\Http\Controllers\Api\PayrollTemplateController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn () => response()->json(['status' => 'ok', 'app' => 'RH+PAIE API v1']));

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

    // Paramètres de l'entreprise (configuration)
    Route::post('/settings', [SettingsController::class, 'update']);
    Route::delete('/settings/logo', [SettingsController::class, 'deleteLogo']);

    // ── Portail Agent (données de l'employé connecté uniquement) ──
    Route::prefix('me')->group(function () {
        Route::get('/profile',           [MeController::class, 'profile']);
        Route::put('/profile',           [MeController::class, 'updateProfile']);
        Route::get('/leaves',            [MeController::class, 'leaves']);
        Route::post('/leaves',           [MeController::class, 'storeLeave']);
        Route::get('/leave-balance',     [MeController::class, 'leaveBalance']);
        Route::get('/attendances',       [MeController::class, 'attendances']);
        Route::post('/attendances/check-in',  [MeController::class, 'checkIn']);
        Route::post('/attendances/check-out', [MeController::class, 'checkOut']);
        Route::get('/tasks',             [MeController::class, 'tasks']);
        Route::patch('/tasks/{task}/status', [MeController::class, 'updateTaskStatus']);
        Route::get('/documents',         [MeController::class, 'documents']);
    });

    // Gestion des utilisateurs
    Route::apiResource('users', UserManagementController::class)->except(['show']);

    // Rôles & droits
    Route::apiResource('roles', RoleController::class)->except(['show']);

    // Paramètres de messagerie (mailing)
    Route::get('/mail-settings',       [MailSettingController::class, 'index']);
    Route::post('/mail-settings',      [MailSettingController::class, 'update']);
    Route::post('/mail-settings/test', [MailSettingController::class, 'test']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Departments
    Route::apiResource('departments', DepartmentController::class);

    // Employees
    Route::post('/employees/import-json',              [EmployeeController::class, 'importJson']);
    Route::get('/employees/counts',                    [EmployeeController::class, 'counts']);
    Route::get('/employees/export',                    [EmployeeController::class, 'export']);
    Route::post('/employees/import',                   [EmployeeController::class, 'import']);
    Route::get('/employees/{employee}/paye-data',      [EmployeeController::class, 'payeData']);
    Route::post('/employees/{employee}/calcul-irpp',   [EmployeeController::class, 'calculIrpp']);
    Route::get('/employees/{employee}/heures-sup',     [EmployeeController::class, 'heuresSup']);
    Route::get('/employees/{employee}/heures-coupure', [EmployeeController::class, 'heuresCoupure']);
    Route::post('/employees/{employee}/photo',         [EmployeeController::class, 'uploadPhoto']);
    Route::apiResource('employees', EmployeeController::class);

    // Emails (envoi intégré à la plateforme)
    Route::get('/emails',      [EmailController::class, 'index']);
    Route::post('/emails/send', [EmailController::class, 'send']);

    // Contracts
    Route::get('/contracts/expiring',       [ContractController::class, 'expiringSoon']);
    Route::get('/contracts/{contract}/pdf', [ContractController::class, 'pdf']);
    Route::apiResource('contracts', ContractController::class);

    // Contract Archives
    Route::get('/contract-archives/{contractArchive}/preview', [ContractArchiveController::class, 'preview']);
    Route::get('/contract-archives/{contractArchive}/download', [ContractArchiveController::class, 'download']);
    Route::post('/contract-archives/match', [ContractArchiveController::class, 'match']);
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

    // Trainings — routes nommées avant apiResource
    Route::get('/trainings/pending',              [TrainingController::class, 'pending']);
    Route::get('/trainings/statistics',           [TrainingController::class, 'statistics']);

    // Paramétrage : types
    Route::get('/trainings/types',                [TrainingController::class, 'types']);
    Route::post('/trainings/types',               [TrainingController::class, 'storeType']);
    Route::put('/trainings/types/{type}',         [TrainingController::class, 'updateType']);
    Route::delete('/trainings/types/{type}',      [TrainingController::class, 'destroyType']);

    // Paramétrage : organismes
    Route::get('/trainings/providers',            [TrainingController::class, 'providers']);
    Route::post('/trainings/providers',           [TrainingController::class, 'storeProvider']);
    Route::put('/trainings/providers/{provider}', [TrainingController::class, 'updateProvider']);
    Route::delete('/trainings/providers/{provider}', [TrainingController::class, 'destroyProvider']);

    // Paramétrage : budgets
    Route::get('/trainings/budgets',              [TrainingController::class, 'budgets']);
    Route::post('/trainings/budgets',             [TrainingController::class, 'storeBudget']);
    Route::put('/trainings/budgets/{budget}',     [TrainingController::class, 'updateBudget']);
    Route::delete('/trainings/budgets/{budget}',  [TrainingController::class, 'destroyBudget']);

    // Paramétrage : centres de coûts
    Route::get('/trainings/cost-centers',                  [TrainingController::class, 'costCenters']);
    Route::post('/trainings/cost-centers',                 [TrainingController::class, 'storeCostCenter']);
    Route::put('/trainings/cost-centers/{costCenter}',     [TrainingController::class, 'updateCostCenter']);
    Route::delete('/trainings/cost-centers/{costCenter}',  [TrainingController::class, 'destroyCostCenter']);

    // Historique par agent
    Route::get('/trainings/employee/{employeeId}/history', [TrainingController::class, 'employeeHistory']);

    // Workflow & actions sur une formation
    Route::post('/trainings/{training}/approve',      [TrainingController::class, 'approve']);
    Route::post('/trainings/{training}/reject',       [TrainingController::class, 'reject']);
    Route::post('/trainings/{training}/request-info', [TrainingController::class, 'requestInfo']);
    Route::post('/trainings/{training}/plan',         [TrainingController::class, 'plan']);
    Route::post('/trainings/{training}/status',       [TrainingController::class, 'setStatus']);
    Route::post('/trainings/{training}/participants', [TrainingController::class, 'addParticipants']);
    Route::delete('/trainings/{training}/participants/{employeeId}', [TrainingController::class, 'removeParticipant']);
    Route::post('/trainings/{training}/attendance',   [TrainingController::class, 'recordAttendance']);
    Route::get('/trainings/{training}/evaluations',   [TrainingController::class, 'evaluations']);
    Route::post('/trainings/{training}/evaluate',     [TrainingController::class, 'evaluate']);

    // Documents & attestations
    Route::get('/trainings/{training}/documents',                 [TrainingController::class, 'documents']);
    Route::post('/trainings/{training}/documents',                [TrainingController::class, 'uploadDocument']);
    Route::delete('/trainings/{training}/documents/{document}',   [TrainingController::class, 'deleteDocument']);
    Route::post('/trainings/{training}/certificates',             [TrainingController::class, 'generateCertificates']);

    Route::apiResource('trainings', TrainingController::class);

    // ── Recrutement ──────────────────────────────────────────────────────────
    Route::get('/recruitment/statistics',                        [RecruitmentController::class, 'statistics']);
    Route::get('/recruitment/pending',                           [RecruitmentController::class, 'pending']);

    // Demandes de recrutement
    Route::post('/recruitment/{recruitmentRequest}/approve',     [RecruitmentController::class, 'approve']);
    Route::post('/recruitment/{recruitmentRequest}/reject',      [RecruitmentController::class, 'reject']);
    Route::apiResource('recruitment', RecruitmentController::class);

    // Offres d'emploi (fiches de poste)
    Route::get('/job-postings',                                  [RecruitmentController::class, 'jobPostings']);
    Route::post('/job-postings',                                 [RecruitmentController::class, 'storeJobPosting']);
    Route::get('/job-postings/{jobPosting}',                     [RecruitmentController::class, 'showJobPosting']);
    Route::put('/job-postings/{jobPosting}',                     [RecruitmentController::class, 'updateJobPosting']);
    Route::delete('/job-postings/{jobPosting}',                  [RecruitmentController::class, 'destroyJobPosting']);
    Route::post('/job-postings/{jobPosting}/publish',            [RecruitmentController::class, 'publishJobPosting']);
    Route::post('/job-postings/{jobPosting}/close',              [RecruitmentController::class, 'closeJobPosting']);

    // Critères d'évaluation
    Route::get('/job-postings/{jobPosting}/criteria',            [RecruitmentController::class, 'criteria']);
    Route::post('/job-postings/{jobPosting}/criteria',           [RecruitmentController::class, 'storeCriterion']);
    Route::put('/job-postings/{jobPosting}/criteria/{criterion}',  [RecruitmentController::class, 'updateCriterion']);
    Route::delete('/job-postings/{jobPosting}/criteria/{criterion}',[RecruitmentController::class, 'destroyCriterion']);

    // Candidatures
    Route::get('/applications',                                  [RecruitmentController::class, 'allApplications']);
    Route::get('/job-postings/{jobPosting}/applications',        [RecruitmentController::class, 'applications']);
    Route::post('/job-postings/{jobPosting}/applications',       [RecruitmentController::class, 'storeApplication']);
    Route::get('/applications/{application}',                    [RecruitmentController::class, 'showApplication']);
    Route::patch('/applications/{application}/status',           [RecruitmentController::class, 'updateApplicationStatus']);
    Route::post('/applications/{application}/documents',         [RecruitmentController::class, 'uploadApplicationDocument']);

    // Entretiens
    Route::get('/interviews',                                    [RecruitmentController::class, 'interviews']);
    Route::post('/interviews',                                   [RecruitmentController::class, 'storeInterview']);
    Route::put('/interviews/{interview}',                        [RecruitmentController::class, 'updateInterview']);
    Route::delete('/interviews/{interview}',                     [RecruitmentController::class, 'destroyInterview']);
    Route::post('/interviews/{interview}/evaluate',              [RecruitmentController::class, 'evaluate']);

    // ── Paramètres Recrutement ───────────────────────────────────────────────
    // Indices
    Route::get('/recruitment-params/indices',                    [RecruitmentParamsController::class, 'indices']);
    Route::post('/recruitment-params/indices',                   [RecruitmentParamsController::class, 'storeIndice']);
    Route::put('/recruitment-params/indices/{indice}',           [RecruitmentParamsController::class, 'updateIndice']);
    Route::delete('/recruitment-params/indices/{indice}',        [RecruitmentParamsController::class, 'destroyIndice']);

    // Hiérarchies
    Route::get('/recruitment-params/hierarchies',                [RecruitmentParamsController::class, 'hierarchies']);
    Route::post('/recruitment-params/hierarchies',               [RecruitmentParamsController::class, 'storeHierarchy']);
    Route::put('/recruitment-params/hierarchies/{hierarchy}',    [RecruitmentParamsController::class, 'updateHierarchy']);
    Route::delete('/recruitment-params/hierarchies/{hierarchy}', [RecruitmentParamsController::class, 'destroyHierarchy']);

    // Augmentations
    Route::get('/recruitment-params/augmentations',                      [RecruitmentParamsController::class, 'augmentations']);
    Route::post('/recruitment-params/augmentations',                     [RecruitmentParamsController::class, 'storeAugmentation']);
    Route::put('/recruitment-params/augmentations/{augmentation}',       [RecruitmentParamsController::class, 'updateAugmentation']);
    Route::delete('/recruitment-params/augmentations/{augmentation}',    [RecruitmentParamsController::class, 'destroyAugmentation']);

    // Augmentations — import bulk
    Route::post('/recruitment-params/augmentations/import', [RecruitmentParamsController::class, 'importAugmentations']);

    // Indices — import bulk
    Route::post('/recruitment-params/indices/import', [RecruitmentParamsController::class, 'importIndices']);

    // Barèmes — import bulk
    Route::post('/recruitment-params/baremes/import', [RecruitmentParamsController::class, 'importBaremes']);

    // Hiérarchies / Classes / Échelons — import bulk Excel
    Route::post('/recruitment-params/hierarchies-import', [RecruitmentParamsController::class, 'importHierarchieClassesEchelons']);

    // Cotisations
    Route::get('/recruitment-params/cotisations',                        [RecruitmentParamsController::class, 'cotisations']);
    Route::post('/recruitment-params/cotisations',                       [RecruitmentParamsController::class, 'storeCotisation']);
    Route::put('/recruitment-params/cotisations/{cotisation}',           [RecruitmentParamsController::class, 'updateCotisation']);
    Route::delete('/recruitment-params/cotisations/{cotisation}',        [RecruitmentParamsController::class, 'destroyCotisation']);

    // Autres rubriques
    Route::get('/recruitment-params/autres-rubriques',                        [RecruitmentParamsController::class, 'autresRubriques']);
    Route::post('/recruitment-params/autres-rubriques',                       [RecruitmentParamsController::class, 'storeAutreRubrique']);
    Route::put('/recruitment-params/autres-rubriques/{autreRubrique}',        [RecruitmentParamsController::class, 'updateAutreRubrique']);
    Route::delete('/recruitment-params/autres-rubriques/{autreRubrique}',     [RecruitmentParamsController::class, 'destroyAutreRubrique']);

    // Classes
    Route::get('/recruitment-params/classes',                    [RecruitmentParamsController::class, 'classes']);
    Route::post('/recruitment-params/classes',                   [RecruitmentParamsController::class, 'storeClasse']);
    Route::put('/recruitment-params/classes/{classe}',           [RecruitmentParamsController::class, 'updateClasse']);
    Route::delete('/recruitment-params/classes/{classe}',        [RecruitmentParamsController::class, 'destroyClasse']);

    // Échelons
    Route::get('/recruitment-params/echelons',                   [RecruitmentParamsController::class, 'echelons']);
    Route::post('/recruitment-params/echelons',                  [RecruitmentParamsController::class, 'storeEchelon']);
    Route::put('/recruitment-params/echelons/{echelon}',         [RecruitmentParamsController::class, 'updateEchelon']);
    Route::delete('/recruitment-params/echelons/{echelon}',      [RecruitmentParamsController::class, 'destroyEchelon']);

    // Barèmes
    Route::get('/recruitment-params/baremes',                    [RecruitmentParamsController::class, 'baremes']);
    Route::post('/recruitment-params/baremes',                   [RecruitmentParamsController::class, 'storeBareme']);
    Route::put('/recruitment-params/baremes/{bareme}',           [RecruitmentParamsController::class, 'updateBareme']);
    Route::delete('/recruitment-params/baremes/{bareme}',        [RecruitmentParamsController::class, 'destroyBareme']);

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

    // ── Plan de Recrutement ──────────────────────────────────────────────────
    Route::prefix('plan-recrutement')->group(function () {
        Route::get('/dashboard',             [PlanRecrutementController::class, 'dashboard']);
        Route::get('/postes',                [PlanRecrutementController::class, 'postes']);
        Route::post('/postes',               [PlanRecrutementController::class, 'createPoste']);
        Route::get('/besoins',               [PlanRecrutementController::class, 'besoins']);
        Route::post('/besoins',              [PlanRecrutementController::class, 'createBesoin']);
        Route::put('/besoins/{id}/valider',  [PlanRecrutementController::class, 'validerBesoin']);
        Route::get('/plans',                 [PlanRecrutementController::class, 'plans']);
        Route::post('/plans',                [PlanRecrutementController::class, 'createPlan']);
        Route::get('/plans/{id}',            [PlanRecrutementController::class, 'showPlan']);
        Route::put('/plans/{id}',            [PlanRecrutementController::class, 'updatePlan']);
        Route::put('/plans/{id}/valider',    [PlanRecrutementController::class, 'validerPlan']);
        Route::post('/plans/{planId}/lignes',[PlanRecrutementController::class, 'createLigne']);
        Route::put('/lignes/{id}',           [PlanRecrutementController::class, 'updateLigne']);
        Route::delete('/lignes/{id}',        [PlanRecrutementController::class, 'deleteLigne']);
        Route::get('/fiches/{pospeId}',      [PlanRecrutementController::class, 'fichesPoste']);
        Route::post('/fiches',               [PlanRecrutementController::class, 'createFiche']);
        Route::get('/processus',             [PlanRecrutementController::class, 'processus']);
        Route::post('/processus',            [PlanRecrutementController::class, 'createProcessus']);
        Route::get('/processus/{id}',        [PlanRecrutementController::class, 'showProcessus']);
        Route::put('/processus/{id}/etape',  [PlanRecrutementController::class, 'avancerEtape']);
        Route::get('/processus/{id}/candidatures', [PlanRecrutementController::class, 'candidatures']);
        Route::post('/candidatures',         [PlanRecrutementController::class, 'createCandidature']);
        Route::put('/candidatures/{id}',     [PlanRecrutementController::class, 'updateCandidature']);
        Route::post('/decisions',            [PlanRecrutementController::class, 'createDecision']);
    });

    // ── Plan de Formation ────────────────────────────────────────────────────
    Route::prefix('plan-formation')->group(function () {
        Route::get('/dashboard',                        [PlanFormationController::class, 'dashboard']);

        // Prestataires
        Route::get('/prestataires',                     [PlanFormationController::class, 'prestataires']);
        Route::post('/prestataires',                    [PlanFormationController::class, 'createPrestataire']);

        // Catalogue actions
        Route::get('/actions',                          [PlanFormationController::class, 'actions']);
        Route::post('/actions',                         [PlanFormationController::class, 'createAction']);

        // Besoins
        Route::get('/besoins',                          [PlanFormationController::class, 'besoins']);
        Route::post('/besoins',                         [PlanFormationController::class, 'createBesoin']);
        Route::put('/besoins/{besoin}/valider',         [PlanFormationController::class, 'validerBesoin']);

        // Plans annuels
        Route::get('/plans',                            [PlanFormationController::class, 'plans']);
        Route::post('/plans',                           [PlanFormationController::class, 'createPlan']);
        Route::get('/plans/{plan}',                     [PlanFormationController::class, 'showPlan']);
        Route::put('/plans/{plan}/valider',             [PlanFormationController::class, 'validerPlan']);

        // Lignes du plan
        Route::post('/plans/{plan}/lignes',             [PlanFormationController::class, 'createLigne']);
        Route::put('/lignes/{ligne}',                   [PlanFormationController::class, 'updateLigne']);
        Route::delete('/lignes/{ligne}',                [PlanFormationController::class, 'deleteLigne']);

        // Sessions
        Route::get('/sessions',                         [PlanFormationController::class, 'sessions']);
        Route::post('/sessions',                        [PlanFormationController::class, 'createSession']);
        Route::get('/sessions/{session}',               [PlanFormationController::class, 'showSession']);
        Route::put('/sessions/{session}',               [PlanFormationController::class, 'updateSession']);

        // Inscriptions
        Route::post('/sessions/{session}/inscrire',     [PlanFormationController::class, 'inscrire']);
        Route::put('/inscriptions/{inscription}',       [PlanFormationController::class, 'updateInscription']);

        // Évaluations
        Route::get('/evaluations',                      [PlanFormationController::class, 'evaluations']);
        Route::post('/evaluations',                     [PlanFormationController::class, 'createEvaluation']);
    });

    // ── Gestion des Carrières ────────────────────────────────────────────────
    Route::prefix('carrieres')->group(function () {
        // Évaluations annuelles
        Route::get('/evaluations',                   [CarriereController::class, 'evaluations']);
        Route::post('/evaluations',                  [CarriereController::class, 'storeEvaluation']);
        Route::put('/evaluations/{evaluation}',      [CarriereController::class, 'updateEvaluation']);

        // Avancements
        Route::get('/avancements/eligibles',         [CarriereController::class, 'eligiblesAvancement']);
        Route::get('/avancements',                   [CarriereController::class, 'avancements']);
        Route::post('/avancements',                  [CarriereController::class, 'storeAvancement']);
        Route::patch('/avancements/{avancement}/valider', [CarriereController::class, 'validerAvancement']);

        // Promotions
        Route::get('/promotions',                    [CarriereController::class, 'promotions']);
        Route::post('/promotions',                   [CarriereController::class, 'storePromotion']);
        Route::patch('/promotions/{promotion}/valider', [CarriereController::class, 'validerPromotion']);

        // PDI
        Route::get('/pdis',                          [CarriereController::class, 'pdis']);
        Route::post('/pdis',                         [CarriereController::class, 'storePdi']);
        Route::put('/pdis/{pdi}',                    [CarriereController::class, 'updatePdi']);

        // Mobilité interne
        Route::get('/mobilites',                     [CarriereController::class, 'mobilites']);
        Route::post('/mobilites',                    [CarriereController::class, 'storeMobilite']);
        Route::patch('/mobilites/{mobilite}/valider', [CarriereController::class, 'validerMobilite']);
    });

    // ── Modèles de Fiche de Paie ────────────────────────────────────────────
    Route::get('/payroll-templates/rubriques/{type}',  [PayrollTemplateController::class, 'rubriques']);
    Route::apiResource('payroll-templates', PayrollTemplateController::class);

    // ── Évaluations période d'essai ──────────────────────────────────────────
    Route::prefix('evaluations')->group(function () {
        Route::get('/dashboard',                [EvaluationController::class, 'dashboard']);
        Route::get('/criteres',                 [EvaluationController::class, 'criteres']);
        Route::get('/',                         [EvaluationController::class, 'index']);
        Route::post('/',                        [EvaluationController::class, 'store']);
        Route::get('/{id}',                     [EvaluationController::class, 'show']);
        Route::put('/{id}/notes',               [EvaluationController::class, 'saveNotes']);
        Route::put('/{id}/auto-evaluation',     [EvaluationController::class, 'autoEvaluation']);
        Route::put('/{id}/avancer',             [EvaluationController::class, 'avancer']);
        Route::put('/{id}/valider-rrh',         [EvaluationController::class, 'validerRrh']);
        Route::put('/{id}/decision-dg',         [EvaluationController::class, 'decisionDg']);
    });
});
