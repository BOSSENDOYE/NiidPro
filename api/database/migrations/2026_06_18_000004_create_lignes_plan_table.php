<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lignes_plan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_recrutement_id')->constrained('plans_recrutement')->cascadeOnDelete();
            $table->foreignId('besoin_id')->nullable()->constrained('besoins_recrutement')->nullOnDelete();
            // classification_ccni: A1|A2|B1|B2|C1|C2
            $table->string('classification_ccni');
            // type_contrat: CDI|CDD|DECRET|Stage
            $table->string('type_contrat');
            $table->unsignedInteger('duree_cdd')->nullable()->comment('durée en mois pour CDD');
            $table->decimal('salaire_base_estime', 12, 2)->nullable();
            $table->decimal('cout_estime', 12, 2)->nullable()->comment('salaire * 1.28 * duree (calculé)');
            $table->unsignedTinyInteger('urgence_operationnelle')->default(3)->comment('1-5');
            $table->unsignedTinyInteger('impact_reglementaire')->default(3)->comment('1-5');
            $table->unsignedTinyInteger('disponibilite_budgetaire')->default(3)->comment('1-5');
            $table->unsignedTinyInteger('profil_marche_disponible')->default(3)->comment('1-5');
            $table->decimal('priorite_score', 5, 2)->nullable()->comment('score calculé (urgence*3 + impact*3 + budget*2 + marche*2) / 40 * 100');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_plan');
    }
};
