<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ligne_plan_id')->constrained('lignes_plan_formation')->cascadeOnDelete();
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('lieu')->nullable();
            $table->foreignId('prestataire_id')->nullable()->constrained('formation_prestataires')->nullOnDelete();
            $table->unsignedInteger('nb_participants_reel')->nullable();
            $table->decimal('cout_reel', 12, 2)->nullable();
            // statut: planifiee|en_cours|realisee|annulee
            $table->string('statut')->default('planifiee');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_sessions');
    }
};
