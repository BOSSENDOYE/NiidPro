<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_augmentations', function (Blueprint $table) {
            $table->decimal('taux', 10, 2)->nullable()->default(null)->change();
            $table->string('unite')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_augmentations', function (Blueprint $table) {
            $table->decimal('taux', 6, 2)->nullable(false)->default(0)->change();
            $table->string('unite')->nullable(false)->default('pourcentage')->change();
        });
    }
};
