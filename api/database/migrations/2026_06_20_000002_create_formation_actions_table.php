<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_actions', function (Blueprint $table) {
            $table->id();
            $table->string('intitule');
            $table->text('objectifs_pedagogiques')->nullable();
            // categorie: reglementaire|manageriale|metier|rh|developpement_personnel|integration
            $table->string('categorie');
            $table->decimal('duree_jours', 5, 1)->default(1);
            // mode: presentiel|distanciel|mixte|tutorat
            $table->string('mode')->default('presentiel');
            // caractere: obligatoire|prioritaire|complementaire
            $table->string('caractere')->default('prioritaire');
            $table->decimal('cout_unitaire_estime', 12, 2)->nullable();
            $table->foreignId('prestataire_id')->nullable()->constrained('formation_prestataires')->nullOnDelete();
            // statut: actif|inactif
            $table->string('statut')->default('actif');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_actions');
    }
};
