<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_posting_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('weight')->default(10)->comment('Pondération en %');
            $table->unsignedTinyInteger('minimum_level')->default(1)->comment('Niveau minimum (1-5)');
            $table->boolean('is_eliminatory')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posting_criteria');
    }
};
