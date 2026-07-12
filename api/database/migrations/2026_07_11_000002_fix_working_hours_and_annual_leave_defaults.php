<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mettre à jour les contrats existants avec 35h → 40h
        DB::table('contracts')
            ->where('working_hours_per_week', 35)
            ->whereNull('deleted_at')
            ->update(['working_hours_per_week' => 40]);

        // Changer le défaut colonne pour les nouveaux contrats
        Schema::table('contracts', function (Blueprint $table) {
            $table->integer('working_hours_per_week')->default(40)->change();
        });

        // Mettre à jour annual_leave_days pour les agents existants (30 → 24)
        DB::table('employees')
            ->where('annual_leave_days', 30)
            ->whereNull('deleted_at')
            ->update(['annual_leave_days' => 24]);

        // Changer le défaut colonne
        Schema::table('employees', function (Blueprint $table) {
            $table->integer('annual_leave_days')->default(24)->change();
        });

        // Mettre à jour max_days_per_year du congé annuel (CA)
        DB::table('leave_types')
            ->where('code', 'CA')
            ->update(['max_days_per_year' => 24]);
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->integer('working_hours_per_week')->default(35)->change();
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->integer('annual_leave_days')->default(25)->change();
        });
    }
};
