<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }
        DB::statement(
            "ALTER TABLE payroll_template_lines MODIFY COLUMN `type` ENUM('base','augmentation','ipress','css','trimf') NOT NULL"
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }
        DB::statement(
            "ALTER TABLE payroll_template_lines MODIFY COLUMN `type` ENUM('augmentation','ipress','css','trimf') NOT NULL"
        );
    }
};
