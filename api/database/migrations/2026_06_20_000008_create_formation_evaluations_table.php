<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inscription_id')->constrained('formation_inscriptions')->cascadeOnDelete();
            // type: a_chaud|acquis_j30|transfert_n90
            $table->string('type');
            $table->decimal('score', 5, 2)->nullable()->comment('0 à 100');
            $table->text('commentaire')->nullable();
            $table->foreignId('evalue_par_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date_evaluation');
            $table->timestamps();

            $table->unique(['inscription_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_evaluations');
    }
};
