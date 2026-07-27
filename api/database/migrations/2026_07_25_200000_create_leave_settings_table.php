<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('annual_quota')->default(24)
                  ->comment('Quota annuel de base (jours ouvrables, Art. L.185 CT)');
            $table->boolean('samedi_ouvrable')->default(true)
                  ->comment('Les samedis comptent comme jours ouvrables (Art. L.147 CT)');
            $table->unsignedTinyInteger('mere_famille_age_max')->default(14)
                  ->comment('Âge max enfant pour majoration mères de famille (Art. L.148 CT)');
            $table->unsignedTinyInteger('mere_famille_jours_enfant')->default(1)
                  ->comment('Jours supplémentaires par enfant éligible (Art. L.148 CT)');
            $table->timestamps();
        });

        // Insérer la ligne unique de paramètres par défaut
        DB::table('leave_settings')->insert([
            'annual_quota'             => 24,
            'samedi_ouvrable'          => true,
            'mere_famille_age_max'     => 14,
            'mere_famille_jours_enfant'=> 1,
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_settings');
    }
};
