<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE payroll_template_lines MODIFY COLUMN `type` ENUM('base','augmentation','ipress','ipm','css','ir','trimf','retenue') NOT NULL"
        );
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE payroll_template_lines MODIFY COLUMN `type` ENUM('base','augmentation','ipress','ipm','css','ir','trimf') NOT NULL"
        );
    }
};
