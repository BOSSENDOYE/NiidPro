<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('etapes_historique', function (Blueprint $table) {
            $table->id();
            $table->foreignId('processus_id')->constrained('processus_recrutement')->cascadeOnDelete();
            // etape: analyse_besoin|elaboration_fiche|publication|selection_cv|tests_ecrits|
            //        entretien_rh|entretien_commission|deliberation|decision_dg|
            //        integration|essai|cloture
            $table->string('etape');
            $table->dateTime('date_entree');
            $table->dateTime('date_sortie')->nullable();
            $table->foreignId('valide_par_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('role_validateur')->nullable();
            $table->text('commentaire')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('etapes_historique');
    }
};
