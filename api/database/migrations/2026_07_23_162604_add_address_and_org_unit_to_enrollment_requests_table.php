<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('enrollment_requests', function (Blueprint $table) {
            $table->string('adresse')->nullable()->after('qualification');
            $table->unsignedBigInteger('organisation_unit_id')->nullable()->after('adresse');
            $table->foreign('organisation_unit_id')
                  ->references('id')->on('organisation_units')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('enrollment_requests', function (Blueprint $table) {
            $table->dropForeign(['organisation_unit_id']);
            $table->dropColumn(['adresse', 'organisation_unit_id']);
        });
    }
};
