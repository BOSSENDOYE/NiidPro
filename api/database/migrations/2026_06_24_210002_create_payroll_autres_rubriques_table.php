<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_autres_rubriques', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->nullable()->unique();
            $table->string('libelle', 255);
            $table->enum('type', ['prime', 'avantage_nature', 'deduction', 'retenue', 'allocation', 'autre'])->default('autre');
            $table->enum('sens', ['gain', 'retenue'])->default('gain');
            $table->enum('unite', ['pourcentage', 'montant'])->nullable();
            $table->decimal('valeur', 14, 2)->nullable();
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_autres_rubriques');
    }
};
