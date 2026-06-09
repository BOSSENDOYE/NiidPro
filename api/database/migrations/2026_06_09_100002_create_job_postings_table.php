<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recruitment_request_id')->nullable()->constrained('recruitment_requests')->nullOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('location')->nullable();
            $table->foreignId('supervisor_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->text('description')->nullable();
            $table->text('missions')->nullable();
            $table->text('responsibilities')->nullable();
            $table->string('education_level')->nullable();
            $table->text('required_diplomas')->nullable();
            $table->unsignedSmallInteger('required_experience_years')->nullable();
            $table->json('technical_skills')->nullable();
            $table->json('behavioral_skills')->nullable();
            $table->text('required_certifications')->nullable();
            $table->json('required_languages')->nullable();
            $table->enum('publication_type', ['internal', 'external', 'both'])->default('both');
            $table->enum('status', ['draft', 'published', 'closed', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->date('closing_date')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_postings');
    }
};
