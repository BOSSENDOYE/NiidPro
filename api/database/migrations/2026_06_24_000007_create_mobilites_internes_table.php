<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobilites_internes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->enum('type_mobilite', ['fonctionnelle', 'geographique', 'organisationnelle']);
            $table->enum('initiateur', ['agent', 'hierarchie', 'direction']);

            // Avant
            $table->foreignId('department_avant_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('position_avant_id')->nullable()->constrained('positions')->nullOnDelete();

            // Après
            $table->foreignId('department_apres_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('position_apres_id')->nullable()->constrained('positions')->nullOnDelete();

            $table->text('motif')->nullable();
            $table->date('date_demande');
            $table->date('date_preavis_30j')->nullable(); // date_demande + 30 jours
            $table->date('date_prise_effet')->nullable();

            // Workflow : RRH → SG/DAF → DG
            $table->foreignId('valide_par_sg_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('valide_par_daf_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decide_par_dg_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date_decision')->nullable();

            $table->boolean('delegues_informes')->default(false);
            $table->text('commentaire_rh')->nullable();
            $table->enum('statut', ['en_etude', 'soumise_sg', 'approuvee', 'refusee'])->default('en_etude');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobilites_internes');
    }
};
