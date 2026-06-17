<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periode_essai_rapports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrat_id')->constrained('contrats_recrutement')->cascadeOnDelete();
            $table->date('date_rapport');
            $table->foreignId('tuteur_id')->nullable()->constrained('users')->nullOnDelete();
            // appreciation: insuffisant|satisfaisant|bien|tres_bien
            $table->string('appreciation');
            // recommandation: confirmer|prolonger|rompre
            $table->string('recommandation');
            $table->text('observations')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('periode_essai_rapports');
    }
};
