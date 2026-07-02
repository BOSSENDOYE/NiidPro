<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_template_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('payroll_templates')->cascadeOnDelete();

            // Type de rubrique : augmentation | ipress | css | trimf
            $table->enum('type', ['augmentation', 'ipress', 'css', 'trimf']);

            // Référence à la rubrique source (nullable pour les lignes manuelles)
            $table->unsignedBigInteger('rubrique_id')->nullable();
            // augmentation | cotisation | autre_rubrique
            $table->string('rubrique_type', 50)->nullable();

            $table->string('code', 50)->nullable();
            $table->string('libelle', 255);

            $table->decimal('nombre', 12, 4)->default(1);
            $table->decimal('base_calcul', 14, 2)->default(0);

            // Part Salariale
            $table->decimal('gain', 14, 2)->default(0);
            $table->decimal('taux_salarial', 8, 4)->default(0);   // ex: 5.4000 = 5.4%
            $table->decimal('retenu_salarial', 14, 2)->default(0);

            // Part Patronale
            $table->decimal('taux_patronal', 8, 4)->default(0);
            $table->decimal('retenu_patronal', 14, 2)->default(0);

            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_template_lines');
    }
};
