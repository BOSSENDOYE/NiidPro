<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_cotisations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->nullable()->unique();
            $table->string('libelle', 255);
            $table->enum('type', ['IPRES', 'CSS', 'IPM', 'TRIMF', 'autre'])->default('autre');
            $table->decimal('taux_salarial', 8, 4)->nullable();
            $table->decimal('taux_patronal', 8, 4)->nullable();
            $table->decimal('plafond', 14, 2)->nullable();
            $table->enum('assiette', ['brut', 'net', 'autre'])->default('brut');
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_cotisations');
    }
};
