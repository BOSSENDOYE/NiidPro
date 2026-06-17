<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('besoins_recrutement', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poste_id')->constrained('plan_postes')->cascadeOnDelete();
            $table->foreignId('direction_id')->constrained('departments')->cascadeOnDelete();
            // motif: depart|nouveau_besoin|projet
            $table->string('motif');
            $table->date('date_constat');
            $table->text('description')->nullable();
            // statut: collecte|valide|rejete
            $table->string('statut')->default('collecte');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('besoins_recrutement');
    }
};
