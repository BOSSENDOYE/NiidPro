<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->decimal('revenu_brut', 14, 2)->default(0)->after('id');
            $table->decimal('trimf_pers', 14, 2)->default(300)->after('revenu_brut');
            $table->decimal('part_1', 14, 2)->default(0)->after('trimf_pers');
            $table->decimal('part_1_5', 14, 2)->default(0)->after('part_1');
            $table->decimal('part_2', 14, 2)->default(0)->after('part_1_5');
            $table->decimal('part_2_5', 14, 2)->default(0)->after('part_2');
            $table->decimal('part_3', 14, 2)->default(0)->after('part_2_5');
            $table->decimal('part_3_5', 14, 2)->default(0)->after('part_3');
            $table->decimal('part_4', 14, 2)->default(0)->after('part_3_5');
            $table->decimal('part_4_5', 14, 2)->default(0)->after('part_4');
            $table->decimal('part_5', 14, 2)->default(0)->after('part_4_5');
            $table->string('id_bareme', 30)->nullable()->after('part_5');
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->dropColumn([
                'revenu_brut','trimf_pers',
                'part_1','part_1_5','part_2','part_2_5','part_3',
                'part_3_5','part_4','part_4_5','part_5','id_bareme',
            ]);
        });
    }
};
