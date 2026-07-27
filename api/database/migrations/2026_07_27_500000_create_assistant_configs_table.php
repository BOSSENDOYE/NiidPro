<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_configs', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('claude');          // claude | openai
            $table->string('api_key')->nullable();                  // stockée chiffrée
            $table->string('model')->default('claude-haiku-4-5-20251001');
            $table->text('system_prompt')->nullable();
            $table->unsignedSmallInteger('max_tokens')->default(1024);
            $table->decimal('temperature', 3, 2)->default(0.7);
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_configs');
    }
};
