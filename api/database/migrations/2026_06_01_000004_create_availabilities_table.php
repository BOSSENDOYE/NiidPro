<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['remote', 'mission', 'training', 'secondment', 'personal', 'suspension']);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'approved', 'active', 'ended', 'cancelled'])->default('pending');
            $table->string('approved_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availabilities');
    }
};
