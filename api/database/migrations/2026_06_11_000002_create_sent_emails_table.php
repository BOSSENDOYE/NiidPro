<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sent_emails')) {
            Schema::create('sent_emails', function (Blueprint $table) {
                $table->id();
                $table->string('to_email');
                $table->string('to_name')->nullable();
                $table->string('subject');
                $table->text('body');
                $table->unsignedBigInteger('employee_id')->nullable();
                $table->unsignedBigInteger('sent_by')->nullable();
                $table->enum('status', ['sent', 'failed'])->default('sent');
                $table->text('error')->nullable();
                $table->timestamps();

                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
                $table->foreign('sent_by')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_emails');
    }
};
