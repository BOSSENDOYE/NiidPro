<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eval_objectifs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('eval_fiches')->cascadeOnDelete();
            $table->text('objectif');
            $table->string('indicateur')->nullable();
            $table->date('echeance')->nullable();
            $table->integer('ordre')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_objectifs');
    }
};
