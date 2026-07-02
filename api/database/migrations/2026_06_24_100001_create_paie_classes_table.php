<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paie_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hierarchy_id')->constrained('recruitment_hierarchies')->onDelete('cascade');
            $table->string('code', 50);
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['hierarchy_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paie_classes');
    }
};
