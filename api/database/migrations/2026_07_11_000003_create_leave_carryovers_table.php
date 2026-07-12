<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_carryovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');            // année clôturée
            $table->decimal('solde_fin_annee', 6, 1);        // solde brut en fin d'année
            $table->decimal('plafond', 6, 1)->default(10);   // plafond de report (configurable)
            $table->decimal('jours_reportes', 6, 1);         // min(solde, plafond)
            $table->foreignId('applique_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('applied_at');
            $table->timestamps();

            $table->unique(['employee_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_carryovers');
    }
};
