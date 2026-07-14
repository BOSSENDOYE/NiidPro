<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eval_notations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->foreignId('critere_id')->constrained('eval_criteres')->cascadeOnDelete();
            $table->unsignedTinyInteger('note')->nullable(); // 1 à 5 (CDC §8.2)
            $table->text('observation')->nullable();         // observation motivée (obligatoire si note < 3)
            $table->timestamps();

            $table->unique(['fiche_id', 'critere_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_notations');
    }
};
