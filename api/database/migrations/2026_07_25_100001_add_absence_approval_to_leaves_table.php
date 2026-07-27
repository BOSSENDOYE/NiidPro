<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->unsignedTinyInteger('abs_approval_level')->default(0)->after('leave_decision_avenir');
            $table->json('abs_approvals')->nullable()->after('abs_approval_level');
        });
    }

    public function down(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->dropColumn(['abs_approval_level', 'abs_approvals']);
        });
    }
};
