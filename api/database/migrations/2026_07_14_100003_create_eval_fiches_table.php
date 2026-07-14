<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eval_fiches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campagne_id')->constrained('eval_campagnes')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('evaluateur_id')->nullable()->constrained('users')->nullOnDelete();

            // Statut workflow (CDC §6)
            $table->enum('statut', [
                'a_planifier',       // fiche générée, entretien non planifié
                'planifiee',         // date entretien fixée
                'en_cours',          // notation en cours
                'signee_evaluateur', // signée par l'évaluateur
                'signee_agent',      // signée par les deux parties (ou refus consigné)
                'transmise_daf',     // transmise au DAF
                'annotee_dg',        // annotée par DG/SG
                'notifiee',          // courrier agent envoyé
                'archivee',          // archivage définitif
            ])->default('a_planifier');

            // Statut de l'agent au moment de l'évaluation (détermine grille dynamique)
            $table->enum('statut_agent', ['contractuel', 'fonctionnaire', 'decisionnaire'])->default('contractuel');

            // Données d'identification snapshot (page 1)
            $table->string('snapshot_direction')->nullable();
            $table->string('snapshot_service')->nullable();
            $table->string('snapshot_fonction')->nullable();
            $table->string('snapshot_matricule')->nullable();
            $table->string('snapshot_superieur')->nullable();
            $table->integer('snapshot_anciennete_mois')->nullable();

            // Entretien (sous-procédure 2)
            $table->date('date_entretien')->nullable();
            $table->string('lieu_entretien')->nullable();
            $table->boolean('entretien_tenu')->default(false);
            $table->timestamp('entretien_tenu_at')->nullable();

            // Notes calculées (sous-procédure 3)
            $table->decimal('moyenne', 4, 2)->nullable();
            $table->enum('appreciation', [
                'excellent',
                'tres_satisfaisant',
                'satisfaisant',
                'a_ameliorer',
                'insuffisant',
            ])->nullable();

            // Page 3 — Bilan professionnel
            $table->text('realisations')->nullable();
            $table->text('difficultes')->nullable();
            $table->text('competences_demontrees')->nullable();

            // Page 4 — Signatures et observations
            $table->text('observations_evaluateur')->nullable();
            $table->text('observations_agent')->nullable();
            $table->boolean('refus_signature_agent')->default(false);
            $table->text('motif_refus_signature')->nullable();

            // Timestamps signatures
            $table->timestamp('signe_evaluateur_at')->nullable();
            $table->timestamp('signe_agent_at')->nullable();
            $table->timestamp('transmise_daf_at')->nullable();
            $table->timestamp('notifiee_at')->nullable();
            $table->timestamp('archivee_at')->nullable();

            // Avis intermédiaires (§9.4 CDC)
            $table->text('avis_chef_service')->nullable();
            $table->foreignId('chef_service_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('avis_dg')->nullable();
            $table->foreignId('dg_user_id')->nullable()->constrained('users')->nullOnDelete();

            // Décideur notifications
            $table->foreignId('daf_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->unique(['campagne_id', 'employee_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_fiches');
    }
};
