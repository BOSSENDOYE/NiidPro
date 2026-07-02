<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans_developpement_individuel', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('evaluation_annuelle_id')->nullable()->constrained('evaluations_annuelles')->nullOnDelete();
            $table->year('annee');

            $table->text('objectifs_professionnels')->nullable();
            $table->text('competences_a_renforcer')->nullable();
            $table->text('commentaire_rh')->nullable();
            $table->text('commentaire_agent')->nullable();

            $table->foreignId('valide_par_rh_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date_validation')->nullable();
            $table->enum('statut', ['brouillon', 'soumis', 'valide'])->default('brouillon');

            $table->timestamps();

            $table->unique(['employee_id', 'annee']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans_developpement_individuel');
    }
};
