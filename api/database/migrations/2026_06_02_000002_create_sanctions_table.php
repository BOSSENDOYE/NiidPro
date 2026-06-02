<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sanctions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['avertissement', 'blame', 'mise_a_pied', 'retrogradation', 'licenciement', 'autre'])
                  ->default('avertissement');
            $table->text('reason');
            $table->date('sanction_date');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->string('decided_by')->nullable();
            $table->string('reference')->nullable();
            $table->enum('status', ['active', 'lifted'])->default('active');
            $table->text('notes')->nullable();
            $table->string('document_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanctions');
    }
};
