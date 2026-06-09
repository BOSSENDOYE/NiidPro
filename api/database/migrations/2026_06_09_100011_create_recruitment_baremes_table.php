<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_baremes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hierarchy_id')
                ->constrained('recruitment_hierarchies')
                ->onDelete('cascade');
            $table->foreignId('indice_id')
                ->constrained('recruitment_indices')
                ->onDelete('cascade');
            $table->integer('echelon')->default(1);
            $table->decimal('salaire_base', 14, 2);
            $table->date('date_application')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['hierarchy_id', 'indice_id', 'echelon', 'date_application'], 'bareme_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_baremes');
    }
};
