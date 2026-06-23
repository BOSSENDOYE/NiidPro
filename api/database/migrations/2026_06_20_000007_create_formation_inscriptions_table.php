<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_inscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('formation_sessions')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            // statut: inscrit|present|absent|certifie
            $table->string('statut')->default('inscrit');
            $table->string('attestation_path')->nullable();
            $table->date('date_attestation')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['session_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_inscriptions');
    }
};
