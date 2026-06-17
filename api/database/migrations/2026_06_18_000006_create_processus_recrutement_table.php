<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('processus_recrutement', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ligne_plan_id')->constrained('lignes_plan')->cascadeOnDelete();
            // etape_courante: analyse_besoin|elaboration_fiche|publication|selection_cv|tests_ecrits|
            //                 entretien_rh|entretien_commission|deliberation|decision_dg|
            //                 integration|essai|cloture
            $table->string('etape_courante')->default('analyse_besoin');
            // statut: en_cours|cloture|abandonne
            $table->string('statut')->default('en_cours');
            $table->date('date_demarrage');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processus_recrutement');
    }
};
