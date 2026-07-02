<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // recruitment_augmentations.type  ENUM → VARCHAR(50)
        DB::statement("ALTER TABLE recruitment_augmentations MODIFY COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'autre'");

        // payroll_cotisations.type  ENUM → VARCHAR(50)
        DB::statement("ALTER TABLE payroll_cotisations MODIFY COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'autre'");

        // payroll_autres_rubriques.type  ENUM → VARCHAR(50)
        DB::statement("ALTER TABLE payroll_autres_rubriques MODIFY COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'autre'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE recruitment_augmentations MODIFY COLUMN `type` ENUM('indiciaire','indemnitaire','prime','autre') NOT NULL DEFAULT 'autre'");
        DB::statement("ALTER TABLE payroll_cotisations MODIFY COLUMN `type` ENUM('IPRES','CSS','IPM','TRIMF','autre') NOT NULL DEFAULT 'autre'");
        DB::statement("ALTER TABLE payroll_autres_rubriques MODIFY COLUMN `type` ENUM('prime','avantage_nature','deduction','retenue','allocation','autre') NOT NULL DEFAULT 'autre'");
    }
};
