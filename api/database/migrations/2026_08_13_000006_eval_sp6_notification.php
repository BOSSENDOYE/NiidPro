<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SP6 — Informer les agents (§7.6) et §9 confidentialité/archivage.
 * Ajoute : modèles de lettre, courriers individuels, colonnes SP6 sur fiches.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Modèles de lettre de notification ────────────────────────────
        Schema::create('eval_modeles_notification', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('objet_lettre');
            $table->text('corps_html');
            $table->json('variables_dispo')->nullable();
            $table->boolean('actif')->default(true);
            $table->foreignId('cree_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // ── Courriers de notification individuels ─────────────────────────
        Schema::create('eval_courriers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('synthese_id')->constrained('eval_syntheses')->cascadeOnDelete();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('modele_id')->nullable()->constrained('eval_modeles_notification')->nullOnDelete();
            $table->text('corps_genere');
            // Circuit signature DAF
            $table->foreignId('signe_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('signe_at')->nullable();
            // Envoi à l'agent
            $table->enum('mode_envoi', ['portail', 'email', 'main_propre'])->nullable();
            $table->foreignId('envoye_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('envoye_at')->nullable();
            // Accusé de consultation (portail NiidPro)
            $table->timestamp('accuse_at')->nullable();
            $table->foreignId('accuse_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['synthese_id', 'fiche_id']);
            $table->index('fiche_id');
        });

        // ── Colonne SP6 sur eval_fiches ───────────────────────────────────
        Schema::table('eval_fiches', function (Blueprint $table) {
            $table->timestamp('courrier_etabli_at')->nullable()->after('archivee_at');
        });
    }

    public function down(): void
    {
        Schema::table('eval_fiches', function (Blueprint $table) {
            $table->dropColumn('courrier_etabli_at');
        });
        Schema::dropIfExists('eval_courriers');
        Schema::dropIfExists('eval_modeles_notification');
    }
};
