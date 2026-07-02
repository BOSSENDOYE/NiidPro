<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('part_trimf', 4, 1)->nullable()->after('indice_id');
            $table->decimal('part_ir',   4, 1)->nullable()->after('part_trimf');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['part_trimf', 'part_ir']);
        });
    }
};
