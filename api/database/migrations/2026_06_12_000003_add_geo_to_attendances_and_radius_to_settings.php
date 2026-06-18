<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('notes');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->integer('distance_metres')->nullable()->after('longitude');
        });

        Schema::table('company_settings', function (Blueprint $table) {
            $table->integer('pointage_radius')->nullable()->default(200)->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'distance_metres']);
        });
        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn('pointage_radius');
        });
    }
};
