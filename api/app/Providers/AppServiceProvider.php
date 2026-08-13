<?php

namespace App\Providers;

use App\Models\EvalFiche;
use App\Observers\EvalFicheObserver;
use App\Policies\EvalFichePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Politique d'accès aux fiches d'évaluation (§9 — Confidentialité)
        Gate::policy(EvalFiche::class, EvalFichePolicy::class);

        // Notifications événementielles sur changement de statut (§10.1)
        EvalFiche::observe(EvalFicheObserver::class);
    }
}
