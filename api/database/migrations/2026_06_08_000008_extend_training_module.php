<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── Centres de coûts ──
        Schema::create('training_cost_centers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
        });

        // ── Documents de formation (pièces jointes, supports, certificats) ──
        Schema::create('training_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->unsignedBigInteger('employee_id')->nullable(); // pour certificats individuels
            $table->enum('category', ['piece_jointe', 'support', 'certificat', 'rapport', 'autre'])->default('piece_jointe');
            $table->string('name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();

            $table->foreign('training_id')->references('id')->on('trainings')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('set null');
        });

        // ── Nouveaux champs sur trainings ──
        Schema::table('trainings', function (Blueprint $table) {
            $table->unsignedBigInteger('cost_center_id')->nullable()->after('funding_source');
            $table->text('info_request')->nullable()->after('rejection_reason'); // compléments demandés
            $table->text('report')->nullable()->after('info_request');           // rapport de formation
            $table->text('recommendations')->nullable()->after('report');        // recommandations futures
            $table->unsignedSmallInteger('overall_score')->nullable()->after('recommendations'); // éval globale /100

            $table->foreign('cost_center_id')->references('id')->on('training_cost_centers')->onDelete('set null');
        });

        // ── Étendre l'enum status (MySQL) pour ajouter 'needs_info' ──
        DB::statement("ALTER TABLE trainings MODIFY COLUMN status ENUM('pending','needs_info','approved','rejected','planned','in_progress','completed','archived') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropForeign(['cost_center_id']);
            $table->dropColumn(['cost_center_id', 'info_request', 'report', 'recommendations', 'overall_score']);
        });

        DB::statement("ALTER TABLE trainings MODIFY COLUMN status ENUM('pending','approved','rejected','planned','in_progress','completed','archived') NOT NULL DEFAULT 'pending'");

        Schema::dropIfExists('training_documents');
        Schema::dropIfExists('training_cost_centers');
    }
};
