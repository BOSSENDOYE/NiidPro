<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_besoins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_id')->nullable()->constrained('formation_actions')->nullOnDelete();
            $table->string('intitule_libre')->nullable()->comment('si action non encore cataloguée');
            $table->foreignId('direction_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->unsignedSmallInteger('annee');
            // source: entretien_annuel|direction|rh|reglementaire
            $table->string('source')->default('direction');
            $table->text('commentaire')->nullable();
            // statut: collecte|retenu|rejete
            $table->string('statut')->default('collecte');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_besoins');
    }
};
