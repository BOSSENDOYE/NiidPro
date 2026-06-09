<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_attendances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->unsignedBigInteger('employee_id');
            $table->date('attendance_date');
            $table->boolean('present')->default(false);
            $table->text('absence_reason')->nullable();
            $table->timestamps();
            
            $table->foreign('training_id')->references('id')->on('trainings')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->unique(['training_id', 'employee_id', 'attendance_date'], 'tr_att_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_attendances');
    }
};
