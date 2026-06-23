<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lignes_plan_formation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_formation_id')->constrained('plans_formation')->cascadeOnDelete();
            $table->foreignId('action_id')->constrained('formation_actions')->cascadeOnDelete();
            $table->foreignId('besoin_id')->nullable()->constrained('formation_besoins')->nullOnDelete();
            $table->foreignId('direction_id')->constrained('departments')->cascadeOnDelete();
            $table->unsignedInteger('nb_participants_prevu')->default(1);
            $table->string('dates_previsionnelles')->nullable();
            $table->decimal('cout_unitaire', 12, 2)->nullable();
            $table->decimal('cout_total', 12, 2)->nullable()->comment('cout_unitaire * nb_participants_prevu (calculé)');
            // source_financement: budget_propre|3fpt|cooperation|bailleurs
            $table->string('source_financement')->default('budget_propre');
            // caractere: obligatoire|prioritaire|complementaire
            $table->string('caractere')->default('prioritaire');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_plan_formation');
    }
};
