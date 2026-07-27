<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_type_configs', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('label', 100);
            $table->string('cat', 50);
            $table->string('color', 20);
            $table->string('bg', 20);
            $table->string('border', 20);
            $table->string('prefix', 10);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_type_configs');
    }
};
