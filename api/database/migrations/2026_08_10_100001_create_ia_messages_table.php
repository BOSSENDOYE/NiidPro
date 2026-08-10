<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ia_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ia_conversation_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['user', 'assistant']);
            $table->text('content');
            $table->timestamps();

            $table->index(['ia_conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ia_messages');
    }
};
