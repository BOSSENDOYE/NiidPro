<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->enum('categorie_avant', ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E']);
            $table->enum('categorie_apres', ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E']);
            $table->enum('type_promotion', ['au_choix', 'concours_interne', 'formation_qualifiante']);

            // Conditions vérifiées
            $table->tinyInteger('annees_dans_categorie')->unsigned()->nullable();
            $table->decimal('note_eval_n1', 3, 2)->nullable();
            $table->decimal('note_eval_n2', 3, 2)->nullable();

            // Dossier candidature
            $table->string('dossier_candidature_path')->nullable();

            // Commission
            $table->date('commission_date')->nullable();
            $table->enum('commission_avis', ['favorable', 'defavorable', 'reporte'])->nullable();
            $table->string('commission_pv_path')->nullable();

            // Décision DG
            $table->foreignId('decide_par_dg_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date_decision')->nullable();
            $table->date('date_effet')->nullable(); // 1er du mois suivant

            $table->text('commentaire')->nullable();
            $table->enum('statut', ['appel_candidature', 'en_instruction', 'commission_tenue', 'accorde', 'refuse'])
                  ->default('appel_candidature');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
