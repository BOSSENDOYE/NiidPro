<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['CDI', 'CDD', 'DECRET', 'DETACHEMENT', 'Stage', 'Alternance', 'Prestation', 'Autre'])->default('CDI');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('trial_period_end')->nullable();
            $table->decimal('salary', 10, 2)->nullable();
            $table->integer('working_hours_per_week')->default(35);
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
