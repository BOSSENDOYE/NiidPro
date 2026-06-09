<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recruitment_indices', function (Blueprint $table) {
            $table->foreignId('hierarchy_id')->nullable()->constrained('recruitment_hierarchies')->nullOnDelete()->after('code');
            $table->string('classe')->nullable()->after('hierarchy_id');
            $table->string('echelon_label')->nullable()->after('classe');
            $table->decimal('valeur_point', 10, 4)->nullable()->after('echelon_label');
            $table->decimal('solde_mensuelle', 14, 2)->nullable()->after('valeur_point');
            $table->string('garde')->nullable()->after('solde_mensuelle');
        });

        Schema::create('recruitment_indice_augmentation', function (Blueprint $table) {
            $table->foreignId('indice_id')->constrained('recruitment_indices')->cascadeOnDelete();
            $table->foreignId('augmentation_id')->constrained('recruitment_augmentations')->cascadeOnDelete();
            $table->primary(['indice_id', 'augmentation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_indice_augmentation');
        Schema::table('recruitment_indices', function (Blueprint $table) {
            $table->dropForeign(['hierarchy_id']);
            $table->dropColumn(['hierarchy_id', 'classe', 'echelon_label', 'valeur_point', 'solde_mensuelle', 'garde']);
        });
    }
};
