<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SP3 — Évaluer et transmettre.
 * Ajoute les blocs narratifs du bilan de la fiche (§7.3).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eval_fiches', function (Blueprint $table) {
            $table->text('bilan_plan_action')->nullable()->after('competences_demontrees');
            $table->text('perspectives_evolution')->nullable()->after('bilan_plan_action');
        });
    }

    public function down(): void
    {
        Schema::table('eval_fiches', function (Blueprint $table) {
            $table->dropColumn(['bilan_plan_action', 'perspectives_evolution']);
        });
    }
};
