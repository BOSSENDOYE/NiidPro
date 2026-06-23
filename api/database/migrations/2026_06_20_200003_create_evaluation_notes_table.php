<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('evaluation_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('evaluations_periode_essai')->cascadeOnDelete();
            $table->foreignId('critere_id')->constrained('evaluation_criteres')->cascadeOnDelete();
            $table->tinyInteger('note')->nullable();          // 1 à 4
            $table->decimal('note_ponderee', 6, 4)->nullable(); // note × poids
            $table->text('commentaire_agent')->nullable();
            $table->text('commentaire_hierarchique')->nullable();
            $table->unique(['evaluation_id', 'critere_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_notes');
    }
};
