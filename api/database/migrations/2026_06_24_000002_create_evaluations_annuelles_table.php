<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations_annuelles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('evaluateur_id')->constrained('users')->cascadeOnDelete();
            $table->year('annee');
            $table->enum('statut', ['brouillon', 'soumise', 'validee'])->default('brouillon');

            // Quatre domaines (note sur 4)
            $table->decimal('note_resultats', 3, 2)->nullable();
            $table->decimal('note_competences', 3, 2)->nullable();
            $table->decimal('note_comportement', 3, 2)->nullable();
            $table->decimal('note_developpement', 3, 2)->nullable();

            // Calculée = moyenne des 4 domaines
            $table->decimal('note_globale', 3, 2)->nullable();
            $table->enum('appreciation', ['insuffisant', 'passable', 'satisfaisant', 'excellent'])->nullable();

            $table->text('objectifs_annee')->nullable();
            $table->text('commentaire_evaluateur')->nullable();
            $table->text('commentaire_agent')->nullable();

            $table->date('date_entretien')->nullable();
            $table->date('date_validation')->nullable();

            $table->timestamps();

            $table->unique(['employee_id', 'annee']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations_annuelles');
    }
};
