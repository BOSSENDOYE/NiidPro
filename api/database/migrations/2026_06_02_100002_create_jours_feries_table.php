<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jours_feries', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->boolean('is_recurring')->default(true)
                ->comment('Vrai = même date chaque année (mois+jour). Faux = date spécifique (lunaire, Pâques…)');
            // Pour jours fixes (is_recurring = true)
            $table->unsignedTinyInteger('mois')->nullable();
            $table->unsignedTinyInteger('jour')->nullable();
            // Pour jours variables (is_recurring = false)
            $table->date('date')->nullable();
            $table->unsignedSmallInteger('annee')->nullable();
            $table->timestamps();
        });

        // ── Jours fériés fixes Sénégal ────────────────────────────────
        $fixed = [
            ['libelle' => 'Jour de l\'An',              'mois' => 1,  'jour' => 1],
            ['libelle' => 'Fête de l\'Indépendance',    'mois' => 4,  'jour' => 4],
            ['libelle' => 'Fête du Travail',             'mois' => 5,  'jour' => 1],
            ['libelle' => 'Assomption',                  'mois' => 8,  'jour' => 15],
            ['libelle' => 'Toussaint',                   'mois' => 11, 'jour' => 1],
            ['libelle' => 'Noël',                        'mois' => 12, 'jour' => 25],
        ];
        foreach ($fixed as $f) {
            DB::table('jours_feries')->insert(array_merge($f, ['is_recurring' => true, 'created_at' => now(), 'updated_at' => now()]));
        }

        // ── Jours fériés variables 2025 ────────────────────────────────
        $variable2025 = [
            ['libelle' => 'Lundi de Pâques',   'date' => '2025-04-21', 'annee' => 2025],
            ['libelle' => 'Ascension',          'date' => '2025-05-29', 'annee' => 2025],
            ['libelle' => 'Lundi de Pentecôte','date' => '2025-06-09', 'annee' => 2025],
            ['libelle' => 'Tamkharit',          'date' => '2025-07-06', 'annee' => 2025],
            ['libelle' => 'Maouloud',           'date' => '2025-09-04', 'annee' => 2025],
            ['libelle' => 'Korité (Aïd el-Fitr)','date' => '2025-03-30','annee' => 2025],
            ['libelle' => 'Tabaski (Aïd el-Adha)','date' => '2025-06-06','annee' => 2025],
        ];

        // ── Jours fériés variables 2026 ────────────────────────────────
        $variable2026 = [
            ['libelle' => 'Lundi de Pâques',   'date' => '2026-04-06', 'annee' => 2026],
            ['libelle' => 'Ascension',          'date' => '2026-05-14', 'annee' => 2026],
            ['libelle' => 'Lundi de Pentecôte','date' => '2026-05-25', 'annee' => 2026],
            ['libelle' => 'Korité (Aïd el-Fitr)','date' => '2026-03-20','annee' => 2026],
            ['libelle' => 'Tabaski (Aïd el-Adha)','date' => '2026-05-27','annee' => 2026],
            ['libelle' => 'Tamkharit',          'date' => '2026-06-26', 'annee' => 2026],
            ['libelle' => 'Maouloud',           'date' => '2026-08-25', 'annee' => 2026],
        ];

        foreach (array_merge($variable2025, $variable2026) as $v) {
            DB::table('jours_feries')->insert(array_merge($v, ['is_recurring' => false, 'created_at' => now(), 'updated_at' => now()]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('jours_feries');
    }
};
