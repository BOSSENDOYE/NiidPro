<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_indice_augmentation', function (Blueprint $table) {
            $table->decimal('montant', 14, 2)->nullable()->after('augmentation_id');
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_indice_augmentation', function (Blueprint $table) {
            $table->dropColumn('montant');
        });
    }
};
