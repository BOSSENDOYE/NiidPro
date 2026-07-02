<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('avancements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->enum('categorie', ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E']);
            $table->tinyInteger('echelon_avant')->unsigned();
            $table->tinyInteger('echelon_apres')->unsigned();
            $table->decimal('note_evaluation', 3, 2)->nullable();
            $table->foreignId('evaluation_annuelle_id')->nullable()->constrained('evaluations_annuelles')->nullOnDelete();

            $table->date('date_eligibilite');
            $table->date('date_decision')->nullable();
            $table->enum('decision', ['accorde', 'refuse', 'reporte'])->nullable();
            $table->text('motif_refus')->nullable();

            // Workflow : RRH → DAF → DG
            $table->foreignId('initie_par_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('valide_par_daf_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decide_par_dg_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('notifie_le')->nullable();

            $table->enum('statut', ['en_attente_daf', 'en_attente_dg', 'accorde', 'refuse', 'reporte'])
                  ->default('en_attente_daf');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avancements');
    }
};
