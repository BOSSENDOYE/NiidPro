<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eval_campagnes', function (Blueprint $table) {
            $table->id();
            $table->year('exercice')->unique();
            $table->string('titre')->nullable();
            $table->enum('statut', ['preparation', 'active', 'synthese', 'cloturee'])->default('preparation');

            // Dates des 6 sous-procédures (calendrier indicatif)
            $table->date('date_lancement')->nullable();
            $table->date('date_limite_planification')->nullable();
            $table->date('date_limite_entretiens')->nullable();
            $table->date('date_limite_transmission')->nullable();
            $table->date('date_limite_synthese')->nullable();
            $table->date('date_cloture')->nullable();

            // Période d'évaluation couverte
            $table->date('periode_debut')->nullable();
            $table->date('periode_fin')->nullable();

            $table->text('note_service')->nullable();   // texte note de service générée

            $table->foreignId('cree_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lance_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('lance_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_campagnes');
    }
};
