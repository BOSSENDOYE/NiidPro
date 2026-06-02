<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            // Règle 48h pour congé maladie
            $table->timestamp('justification_deadline')->nullable()->after('rejection_reason')
                ->comment('Date limite de dépôt du justificatif médical (approved_at + 48h)');
            $table->timestamp('justification_submitted_at')->nullable()->after('justification_deadline')
                ->comment('Date de réception du justificatif');
            $table->string('comment')->nullable()->after('justification_submitted_at')
                ->comment('Commentaire de validation/refus');

            // Contrôles métier
            $table->boolean('friday_rule_applied')->default(false)->after('comment')
                ->comment('Règle vendredi appliquée : date départ décalée au lundi');
            $table->date('original_start_date')->nullable()->after('friday_rule_applied')
                ->comment('Date de départ initiale avant application règle vendredi');
        });
    }

    public function down(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->dropColumn([
                'justification_deadline', 'justification_submitted_at',
                'comment', 'friday_rule_applied', 'original_start_date',
            ]);
        });
    }
};
