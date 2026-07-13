<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollment_requests', function (Blueprint $table) {
            $table->id();
            $table->string('matricule');
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_naissance');
            $table->string('lieu_naissance');
            $table->date('date_embauche');
            $table->string('fonction');
            $table->string('telephone');
            $table->string('email');
            // Facultatifs
            $table->string('categorie_emploi')->nullable();
            $table->string('qualification')->nullable();
            // Workflow
            $table->enum('status', ['pending', 'validated', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('matched_employee_id')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('matched_employee_id')->references('id')->on('employees')->nullOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_requests');
    }
};
