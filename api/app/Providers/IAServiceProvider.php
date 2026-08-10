<?php

namespace App\Providers;

use App\Services\IA\ToolRegistry;
use App\Services\IA\Tools\RechercherAgentTool;
use App\Services\IA\Tools\SoldeCongesTool;
use Illuminate\Support\ServiceProvider;

class IAServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ToolRegistry::class, function () {
            $registry = new ToolRegistry();
            $registry->register(new SoldeCongesTool());
            $registry->register(new RechercherAgentTool());
            return $registry;
        });
    }
}
