<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paie_echelons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('paie_classes')->onDelete('cascade');
            $table->unsignedTinyInteger('numero');
            $table->string('libelle')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['class_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paie_echelons');
    }
};
