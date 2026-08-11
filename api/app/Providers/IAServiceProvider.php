<?php

namespace App\Providers;

use App\Services\IA\ToolRegistry;
use App\Services\IA\Tools\BulletinsPaieTool;
use App\Services\IA\Tools\CarriereAgentTool;
use App\Services\IA\Tools\DossierAgentTool;
use App\Services\IA\Tools\EvaluationsAgentTool;
use App\Services\IA\Tools\FormationsAgentTool;
use App\Services\IA\Tools\GenererDocumentTool;
use App\Services\IA\Tools\HistoriqueCongesAgentTool;
use App\Services\IA\Tools\PointageAgentTool;
use App\Services\IA\Tools\RechercherAgentTool;
use App\Services\IA\Tools\SanctionsAgentTool;
use App\Services\IA\Tools\SoldeCongesTool;
use App\Services\IA\Tools\StatistiquesRHTool;
use App\Services\IA\Tools\LireFichierTool;
use Illuminate\Support\ServiceProvider;

class IAServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ToolRegistry::class, function () {
            $registry = new ToolRegistry();

            // Agents
            $registry->register(new RechercherAgentTool());
            $registry->register(new DossierAgentTool());

            // Congés
            $registry->register(new SoldeCongesTool());
            $registry->register(new HistoriqueCongesAgentTool());

            // Paie
            $registry->register(new BulletinsPaieTool());

            // Formations
            $registry->register(new FormationsAgentTool());

            // Évaluations & Carrière
            $registry->register(new EvaluationsAgentTool());
            $registry->register(new CarriereAgentTool());

            // Pointage
            $registry->register(new PointageAgentTool());

            // Disciplinaire
            $registry->register(new SanctionsAgentTool());

            // Statistiques & Documents
            $registry->register(new StatistiquesRHTool());
            $registry->register(new GenererDocumentTool());

            // Bibliothèque de fichiers
            $registry->register(new LireFichierTool());

            return $registry;
        });
    }
}
