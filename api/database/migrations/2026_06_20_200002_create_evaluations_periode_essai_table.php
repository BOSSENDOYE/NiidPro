<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('evaluations_periode_essai', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');           // 3_mois | 6_mois
            $table->string('categorie');      // A1 | A2 | B1 | B2 | C | D | E
            $table->date('date_prise_poste');
            $table->date('date_fin_periode');
            $table->date('date_envoi_fiche')->nullable();
            $table->date('date_entretien')->nullable();
            $table->decimal('note_globale', 4, 2)->nullable();
            $table->string('appreciation')->nullable();      // insuffisant | passable | satisfaisant | excellent
            $table->string('decision_recommandee')->nullable(); // confirmation | renouvellement | non_confirmation
            $table->text('commentaire_general')->nullable();
            $table->text('plan_amelioration')->nullable();
            $table->string('statut')->default('brouillon');
            // brouillon | auto_evaluation | entretien | signe | valide_rrh | decision_dg | archive
            $table->string('statut_dossier')->default('en_cours');
            // en_cours | confirme | renouvele | non_confirme | en_attente
            $table->timestamp('signe_agent_at')->nullable();
            $table->timestamp('signe_hierarchique_at')->nullable();
            $table->timestamp('valide_rrh_at')->nullable();
            $table->foreignId('valide_rrh_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decision_dg_at')->nullable();
            $table->foreignId('decision_dg_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decision_finale')->nullable(); // confirmation | renouvellement | non_confirmation
            $table->text('remarques_dg')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations_periode_essai');
    }
};
