<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans_recrutement', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('annee');
            $table->string('titre');
            $table->date('periode_debut');
            $table->date('periode_fin');
            $table->decimal('enveloppe_budgetaire', 15, 2)->nullable();
            // statut: brouillon|valide_dg
            $table->string('statut')->default('brouillon');
            $table->foreignId('valide_par_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('date_validation')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans_recrutement');
    }
};
