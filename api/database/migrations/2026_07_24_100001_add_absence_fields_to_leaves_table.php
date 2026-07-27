<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->string('leave_decision_ref', 100)->nullable()->after('reason');
            $table->boolean('leave_decision_avenir')->default(false)->after('leave_decision_ref');
        });
    }

    public function down(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->dropColumn(['leave_decision_ref', 'leave_decision_avenir']);
        });
    }
};
