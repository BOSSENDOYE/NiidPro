<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('fonction')->nullable()->after('categorie_emploi');
            $table->string('qualification')->nullable()->after('fonction');
            $table->string('niveau_rh')->nullable()->after('qualification');
            $table->unsignedTinyInteger('nombre_femmes')->default(0)->after('nombre_enfants_charge');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['fonction', 'qualification', 'niveau_rh', 'nombre_femmes']);
        });
    }
};
