<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_postes', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->foreignId('direction_id')->constrained('departments')->cascadeOnDelete();
            // classification_ccni: A1|A2|B1|B2|C1|C2
            $table->string('classification_ccni');
            // type_contrat_defaut: CDI|CDD|DECRET|Stage
            $table->string('type_contrat_defaut');
            // statut: actif|inactif
            $table->string('statut')->default('actif');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_postes');
    }
};
