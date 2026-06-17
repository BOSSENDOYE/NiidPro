<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrats_recrutement', function (Blueprint $table) {
            $table->id();
            $table->foreignId('decision_id')->constrained('decisions_recrutement')->cascadeOnDelete();
            // type_contrat: CDI|CDD|DECRET|Stage
            $table->string('type_contrat');
            $table->date('date_debut');
            $table->date('date_fin')->nullable();
            $table->date('date_fin_essai')->nullable();
            $table->decimal('salaire_base', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrats_recrutement');
    }
};
