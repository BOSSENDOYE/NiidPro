<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organisation_units', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('libelle', 200);
            $table->enum('type', ['gouvernance', 'appui', 'cellule', 'direction', 'division'])->default('direction');
            $table->unsignedTinyInteger('niveau')->default(0);
            $table->foreignId('parent_id')->nullable()->constrained('organisation_units')->nullOnDelete();
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organisation_units');
    }
};
