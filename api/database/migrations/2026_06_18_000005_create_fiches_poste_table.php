<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiches_poste', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poste_id')->constrained('plan_postes')->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->json('contenu_json');
            // classification_ccni: A1|A2|B1|B2|C1|C2
            $table->string('classification_ccni');
            // statut: brouillon|valide_sg
            $table->string('statut')->default('brouillon');
            $table->foreignId('valide_par_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('date_validation')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiches_poste');
    }
};
