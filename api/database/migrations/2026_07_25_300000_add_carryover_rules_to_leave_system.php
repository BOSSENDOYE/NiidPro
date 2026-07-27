<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Champs de suivi des reports sur employees ──────────────────────
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('jours_reportes', 6, 1)->default(0)->after('nbre_jour_restant')
                  ->comment('Jours reportés de la clôture précédente (FIFO – les plus anciens sont consommés en premier)');
            $table->unsignedSmallInteger('annee_expiration_report')->nullable()->after('jours_reportes')
                  ->comment('Année à laquelle le solde reporté expire (ex : 2027 = expire lors de la clôture 2027)');
        });

        // ── 2. Règles configurables sur leave_settings ────────────────────────
        Schema::table('leave_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_jours_obligatoires')->default(6)->after('annual_quota')
                  ->comment('Minimum de jours à prendre par an avant tout report (défaut 6, Art. L.185 CT)');
            $table->unsignedTinyInteger('report_annees_max')->default(2)->after('min_jours_obligatoires')
                  ->comment('Nombre d\'années max sur lesquelles un report peut s\'accumuler (défaut 2)');
        });

        // Mettre à jour la ligne de paramètres existante
        \DB::table('leave_settings')->update([
            'min_jours_obligatoires' => 6,
            'report_annees_max'      => 2,
        ]);

        // ── 3. Colonnes de traçabilité sur leave_carryovers ──────────────────
        Schema::table('leave_carryovers', function (Blueprint $table) {
            $table->decimal('jours_pris_annee', 6, 1)->default(0)->after('jours_reportes')
                  ->comment('Jours effectivement pris dans l\'année clôturée');
            $table->decimal('jours_reportes_expires', 6, 1)->default(0)->after('jours_pris_annee')
                  ->comment('Jours de report de l\'année précédente qui ont expiré lors de cette clôture');
            $table->unsignedSmallInteger('annee_expiration_report')->nullable()->after('jours_reportes_expires')
                  ->comment('Année d\'expiration du nouveau report enregistré');
            $table->boolean('min_jours_respecte')->default(true)->after('annee_expiration_report')
                  ->comment('L\'agent a-t-il respecté le minimum obligatoire de jours à prendre ?');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['jours_reportes', 'annee_expiration_report']);
        });

        Schema::table('leave_settings', function (Blueprint $table) {
            $table->dropColumn(['min_jours_obligatoires', 'report_annees_max']);
        });

        Schema::table('leave_carryovers', function (Blueprint $table) {
            $table->dropColumn([
                'jours_pris_annee', 'jours_reportes_expires',
                'annee_expiration_report', 'min_jours_respecte',
            ]);
        });
    }
};
