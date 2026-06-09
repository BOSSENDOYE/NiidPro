<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_evaluations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedSmallInteger('score')->nullable();
            $table->text('feedback')->nullable();
            $table->string('evaluator_name')->nullable();
            $table->timestamp('evaluation_date')->nullable();
            $table->text('recommendations')->nullable();
            $table->enum('status', ['pending', 'completed'])->default('pending');
            $table->timestamps();
            
            $table->foreign('training_id')->references('id')->on('trainings')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->unique(['training_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_evaluations');
    }
};
