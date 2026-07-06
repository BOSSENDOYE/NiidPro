<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('evaluation_historique', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('evaluations_periode_essai')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('etape');
            $table->text('commentaire')->nullable();
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('evaluation_historique');
        Schema::enableForeignKeyConstraints();
    }
};
