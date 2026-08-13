<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Table des décisions de gratification (une par agent par synthèse) ──
        Schema::create('eval_gratifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('synthese_id')->constrained('eval_syntheses')->cascadeOnDelete();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('type_decision'); // prime, lettre_felicitation, promotion, aucune, avertissement
            $table->text('commentaire')->nullable();
            $table->foreignId('decide_par')->constrained('users');
            $table->timestamp('decided_at');
            $table->timestamps();
            $table->unique(['synthese_id', 'fiche_id']);
        });

        // ── Colonnes SP5 sur eval_syntheses ──────────────────────────────────
        Schema::table('eval_syntheses', function (Blueprint $table) {
            $table->text('annotation_dg')->nullable();
            $table->foreignId('etudie_dg_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('etudie_dg_at')->nullable();
            $table->foreignId('valide_dg_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('valide_dg_at')->nullable();
        });

        // Étendre l'enum (MySQL seulement — SQLite stocke déjà en VARCHAR)
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE eval_syntheses MODIFY COLUMN statut
                 ENUM('brouillon','transmis','valide_dg') NOT NULL DEFAULT 'brouillon'"
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_gratifications');

        if (DB::getDriverName() === 'mysql') {
            Schema::table('eval_syntheses', function (Blueprint $table) {
                $table->dropForeign(['etudie_dg_par']);
                $table->dropForeign(['valide_dg_par']);
            });
            DB::statement(
                "ALTER TABLE eval_syntheses MODIFY COLUMN statut
                 ENUM('brouillon','transmis') NOT NULL DEFAULT 'brouillon'"
            );
        }

        Schema::table('eval_syntheses', function (Blueprint $table) {
            $table->dropColumn(['annotation_dg', 'etudie_dg_par', 'etudie_dg_at', 'valide_dg_par', 'valide_dg_at']);
        });
    }
};
