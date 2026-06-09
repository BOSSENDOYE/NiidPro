<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->string('application_number')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->date('application_date');
            $table->enum('status', [
                'received', 'pre_selected', 'rejected_pre',
                'convoked', 'interviewed', 'rejected', 'selected', 'hired',
            ])->default('received');
            $table->string('cv_path')->nullable();
            $table->string('cover_letter_path')->nullable();
            $table->decimal('overall_score', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
