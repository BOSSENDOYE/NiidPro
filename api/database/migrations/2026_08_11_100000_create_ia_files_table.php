<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ia_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained('ia_conversations')->cascadeOnDelete();
            $table->string('filename');
            $table->string('path');
            $table->string('media_type', 60);
            $table->longText('content')->nullable();
            $table->integer('size_kb')->default(0);
            $table->boolean('is_persistent')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ia_files');
    }
};
