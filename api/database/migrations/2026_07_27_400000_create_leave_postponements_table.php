<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_postponements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('leave_id')->nullable()->constrained('leaves')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();

            // Dates
            $table->date('date_depart_initial');
            $table->date('date_retour_initial');
            $table->date('date_depart_effectif');
            $table->date('date_retour_effectif');
            $table->unsignedSmallInteger('jours_report');
            $table->text('motif');

            // Statut global
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');

            // Niveau 1 — Avis du Directeur
            $table->enum('n1_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('n1_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('n1_at')->nullable();
            $table->text('n1_comment')->nullable();

            // Niveau 2 — Chef Division RH
            $table->enum('n2_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('n2_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('n2_at')->nullable();
            $table->text('n2_comment')->nullable();

            // Niveau 3 — DAF
            $table->enum('n3_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('n3_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('n3_at')->nullable();
            $table->text('n3_comment')->nullable();

            // Niveau 4 — SG
            $table->enum('n4_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('n4_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('n4_at')->nullable();
            $table->text('n4_comment')->nullable();

            // Niveau 5 — DG
            $table->enum('n5_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('n5_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('n5_at')->nullable();
            $table->text('n5_comment')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_postponements');
    }
};
