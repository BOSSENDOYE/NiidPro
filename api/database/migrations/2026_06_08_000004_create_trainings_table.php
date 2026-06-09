<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->unsignedBigInteger('training_type_id');
            $table->unsignedBigInteger('provider_id')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->text('objectives');
            $table->text('justification');
            $table->unsignedInteger('participants_count')->default(0);
            $table->date('desired_date')->nullable();
            $table->unsignedInteger('duration_days')->default(1);
            $table->string('location')->nullable();
            $table->decimal('estimated_cost', 15, 2)->nullable();
            $table->string('funding_source')->nullable();
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->enum('status', ['pending', 'approved', 'rejected', 'planned', 'in_progress', 'completed', 'archived'])->default('pending');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('actual_cost', 15, 2)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            
            $table->foreign('training_type_id')->references('id')->on('training_types');
            $table->foreign('provider_id')->references('id')->on('training_providers')->onDelete('set null');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainings');
    }
};
