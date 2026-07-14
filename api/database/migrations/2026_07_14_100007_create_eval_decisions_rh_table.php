<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eval_decisions_rh', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            // Types de décisions RH (CDC §8.4 page 4)
            $table->boolean('formation')->default(false);
            $table->boolean('coaching')->default(false);
            $table->boolean('mobilite')->default(false);
            $table->boolean('felicitations')->default(false);
            $table->boolean('suivi_particulier')->default(false);
            $table->string('autre')->nullable();         // champ libre "Autres"
            $table->text('commentaire')->nullable();
            $table->boolean('gratification')->default(false);
            $table->string('montant_gratification')->nullable();
            $table->foreignId('decideur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decide_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_decisions_rh');
    }
};
