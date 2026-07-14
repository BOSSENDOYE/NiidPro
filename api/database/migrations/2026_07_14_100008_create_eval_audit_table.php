<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eval_audit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');           // ex: fiche.noter, fiche.signer_evaluateur, campagne.lancer
            $table->string('entite_type');      // EvalFiche | EvalCampagne
            $table->unsignedBigInteger('entite_id');
            $table->json('meta')->nullable();   // données contextuelles (avant/après)
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eval_audit');
    }
};
