<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidatures_plan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('processus_id')->constrained('processus_recrutement')->cascadeOnDelete();
            $table->string('nom');
            $table->string('prenom');
            $table->string('email')->nullable();
            $table->string('telephone')->nullable();
            $table->string('cv_path')->nullable();
            $table->string('lettre_path')->nullable();
            // statut: recu|shortliste|test|entretien|retenu|rejete
            $table->string('statut')->default('recu');
            $table->decimal('score', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidatures_plan');
    }
};
