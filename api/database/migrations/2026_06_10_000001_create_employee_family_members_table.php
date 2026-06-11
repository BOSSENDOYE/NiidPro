<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('employee_family_members')) {
            Schema::create('employee_family_members', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('employee_id');
                // Conjoint(e) / Fils / Fille / Autre  (alimente l'onglet "Conjoints/Enfants")
                $table->string('relation')->default('Autre');
                $table->string('first_name')->nullable();
                $table->string('last_name')->nullable();
                $table->date('birth_date')->nullable();
                $table->string('birth_place')->nullable();
                $table->enum('gender', ['M', 'F'])->nullable();
                $table->string('activity')->nullable();       // Étude / Travail
                $table->string('document_type')->nullable();  // pièce d'état civil (acte de naissance…)
                $table->timestamps();

                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_family_members');
    }
};
