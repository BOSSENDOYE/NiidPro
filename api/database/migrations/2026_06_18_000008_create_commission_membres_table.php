<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commission_membres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('processus_id')->constrained('processus_recrutement')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // role: president|rrh|expert_technique
            $table->string('role');
            $table->timestamps();

            $table->unique(['processus_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_membres');
    }
};
