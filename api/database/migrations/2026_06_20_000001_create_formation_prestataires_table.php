<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_prestataires', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            // type: externe|public|interne|bailleurs
            $table->string('type')->default('externe');
            $table->string('contact_nom')->nullable();
            $table->string('email')->nullable();
            $table->string('telephone')->nullable();
            $table->string('adresse')->nullable();
            // statut: actif|inactif
            $table->string('statut')->default('actif');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_prestataires');
    }
};
