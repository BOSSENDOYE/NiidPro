<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detail_planning_conges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('annee');
            $table->char('critere', 1)->default('G')->comment('G=Global, E=Entité, A=Agent');
            $table->date('date_generation');
            $table->date('date_limite');

            // ── Solde de départ ──
            $table->decimal('nbre_jour_dispo', 6, 1)->default(0)
                ->comment('Solde restant au début du calcul (nbre_jour_restant)');

            // ── Suppléments ──
            $table->decimal('supplement_enfant', 5, 1)->default(0)
                ->comment('+2j par enfant à charge (femmes uniquement)');
            $table->decimal('supplement_anciennete', 5, 1)->default(0)
                ->comment('Jours bonus selon ancienneté');
            $table->decimal('supplement_medaille', 5, 1)->default(0)
                ->comment('Jours bonus médaille de travail');

            // ── Calcul période ──
            $table->decimal('nbre_jour_conges', 6, 1)->default(0)
                ->comment('Jours acquis = mois écoulés × nbre_jour_conge');
            $table->decimal('nbre_jour_a_imputer', 6, 1)->default(0)
                ->comment('Jours de congés déjà utilisés depuis le dernier calcul');

            // ── Total final ──
            $table->decimal('nbre_jour_total_disponible', 7, 1)->default(0)
                ->comment('= dispo + conges + suppléments - imputés');

            $table->foreignId('utilisateur_cre')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('statut', ['brouillon', 'valide'])->default('valide');
            $table->timestamps();

            $table->unique(['employee_id', 'annee', 'date_generation']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detail_planning_conges');
    }
};
