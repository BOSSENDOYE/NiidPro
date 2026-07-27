<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_configs', function (Blueprint $table) {
            $table->id();
            $table->string('workflow_key', 50);    // ex: 'absence', 'conge_special'
            $table->string('workflow_label', 150);  // libellé affiché
            $table->unsignedTinyInteger('level');   // 1–5
            $table->string('label', 150);           // libellé du niveau
            $table->string('role_name', 100);       // rôle assigné
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['workflow_key', 'level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_configs');
    }
};
