<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE `employees` MODIFY COLUMN `anciennete_recrutement` DECIMAL(5,1) UNSIGNED NOT NULL DEFAULT 0");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `employees` MODIFY COLUMN `anciennete_recrutement` SMALLINT UNSIGNED NOT NULL DEFAULT 0");
    }
};
