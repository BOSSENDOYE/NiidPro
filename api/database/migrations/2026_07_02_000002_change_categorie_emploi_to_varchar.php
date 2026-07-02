<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `employees` MODIFY COLUMN `categorie_emploi` VARCHAR(20) NULL");
        DB::statement("ALTER TABLE `employees` MODIFY COLUMN `echelon` VARCHAR(20) NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `employees` MODIFY COLUMN `categorie_emploi` ENUM('A1','A2','B1','B2','C','D','E') NULL");
        DB::statement("ALTER TABLE `employees` MODIFY COLUMN `echelon` TINYINT UNSIGNED NOT NULL DEFAULT 1");
    }
};
