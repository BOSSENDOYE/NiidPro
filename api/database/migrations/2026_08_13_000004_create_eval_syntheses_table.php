<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eval_syntheses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campagne_id')->constrained('eval_campagnes')->cascadeOnDelete();
            $table->unsignedSmallInteger('version')->default(1);
            $table->enum('statut', ['brouillon', 'transmis'])->default('brouillon');

            // Snapshot JSON agrégeant toutes les données au moment de la génération
            $table->json('donnees')->nullable();

            // Contrôle de complétude (DAF confirme explicitement avant de transmettre au DG)
            $table->boolean('completude_confirmee')->default(false);
            $table->foreignId('completude_confirmee_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completude_confirmee_at')->nullable();

            // Annotations Division RH (contribution sans droit de validation)
            $table->text('notes_division_rh')->nullable();
            $table->foreignId('notes_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('notes_at')->nullable();

            // Transmission au DG (DAF uniquement)
            $table->foreignId('transmis_dg_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transmis_dg_at')->nullable();

            // Auteur de la génération
            $table->foreignId('genere_par')->constrained('users');
            $table->timestamps();

            $table->index(['campagne_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_syntheses');
    }
};
