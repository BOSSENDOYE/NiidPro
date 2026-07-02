<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pdi_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pdi_id')->constrained('plans_developpement_individuel')->cascadeOnDelete();
            $table->enum('type', ['formation', 'mission', 'projet_transverse']);
            $table->string('intitule');
            $table->string('organisme')->nullable();
            $table->tinyInteger('duree_jours')->unsigned()->nullable();
            $table->date('echeance')->nullable();
            $table->string('indicateur_suivi')->nullable();
            $table->enum('statut', ['planifie', 'en_cours', 'realise', 'abandonne'])->default('planifie');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdi_actions');
    }
};
