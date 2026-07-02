<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('payroll_template_id')
                  ->nullable()
                  ->after('status')
                  ->constrained('payroll_templates')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\PayrollTemplate::class, 'payroll_template_id');
            $table->dropColumn('payroll_template_id');
        });
    }
};
