<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_augmentations', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->string('type')->default('indiciaire'); // indiciaire, indemnitaire, prime, autre
            $table->decimal('taux', 6, 2);                 // % or FCFA depending on type
            $table->string('unite')->default('pourcentage'); // pourcentage, montant
            $table->date('date_effet')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_augmentations');
    }
};
