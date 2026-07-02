<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->enum('categorie_emploi', ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E'])->nullable()->after('position_id');
            $table->tinyInteger('echelon')->unsigned()->default(1)->after('categorie_emploi');
            $table->date('date_entree_echelon')->nullable()->after('echelon');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['categorie_emploi', 'echelon', 'date_entree_echelon']);
        });
    }
};
