<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SP2 — Planification des entretiens.
 * Ajoute les colonnes de suivi convocation + compteur replanifications.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eval_fiches', function (Blueprint $table) {
            $table->timestamp('convocation_envoyee_at')->nullable()->after('entretien_tenu_at');
            $table->timestamp('convocation_accusee_at')->nullable()->after('convocation_envoyee_at');
            $table->unsignedTinyInteger('nb_replanifications')->default(0)->after('motif_report');
        });
    }

    public function down(): void
    {
        Schema::table('eval_fiches', function (Blueprint $table) {
            $table->dropColumn(['convocation_envoyee_at', 'convocation_accusee_at', 'nb_replanifications']);
        });
    }
};
