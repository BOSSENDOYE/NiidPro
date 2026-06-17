<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('decisions_recrutement', function (Blueprint $table) {
            $table->id();
            $table->foreignId('processus_id')->constrained('processus_recrutement')->cascadeOnDelete();
            $table->foreignId('candidature_id')->nullable()->constrained('candidatures_plan')->nullOnDelete();
            // type: recrute|non_recrute|reporte|annule
            $table->string('type');
            $table->text('commentaire')->nullable();
            $table->foreignId('valide_par_dg_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date_decision');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decisions_recrutement');
    }
};
