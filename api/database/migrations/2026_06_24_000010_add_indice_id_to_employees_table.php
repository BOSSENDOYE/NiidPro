<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('indice_id')
                  ->nullable()
                  ->after('payroll_template_id')
                  ->constrained('recruitment_indices')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['indice_id']);
            $table->dropColumn('indice_id');
        });
    }
};
