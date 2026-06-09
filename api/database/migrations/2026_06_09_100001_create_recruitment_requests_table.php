<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->string('position_title');
            $table->unsignedSmallInteger('number_of_positions')->default(1);
            $table->enum('contract_type', ['CDI', 'CDD', 'Stage', 'Consultant', 'Freelance', 'Autre'])->default('CDI');
            $table->date('desired_start_date')->nullable();
            $table->text('justification');
            $table->string('hierarchical_level')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['draft', 'pending_rh', 'approved', 'rejected', 'in_progress', 'closed'])->default('draft');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_requests');
    }
};
