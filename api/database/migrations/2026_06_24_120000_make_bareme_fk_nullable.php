<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Étape 1 : supprimer les FK d'abord
        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->dropForeign(['hierarchy_id']);
            $table->dropForeign(['indice_id']);
        });

        // Étape 2 : supprimer l'index unique, rendre les colonnes nullable
        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->dropUnique('bareme_unique');
            $table->unsignedBigInteger('hierarchy_id')->nullable()->change();
            $table->unsignedBigInteger('indice_id')->nullable()->change();
        });

        // Étape 3 : recréer les FK nullable + l'index unique
        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->foreign('hierarchy_id')
                ->references('id')->on('recruitment_hierarchies')
                ->onDelete('set null');

            $table->foreign('indice_id')
                ->references('id')->on('recruitment_indices')
                ->onDelete('set null');

            $table->unique(['hierarchy_id', 'indice_id', 'echelon', 'date_application'], 'bareme_unique');
        });
    }

    public function down(): void
    {
        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->dropForeign(['hierarchy_id']);
            $table->dropForeign(['indice_id']);
        });

        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->dropUnique('bareme_unique');
            $table->unsignedBigInteger('hierarchy_id')->nullable(false)->change();
            $table->unsignedBigInteger('indice_id')->nullable(false)->change();
        });

        Schema::table('recruitment_baremes', function (Blueprint $table) {
            $table->foreign('hierarchy_id')
                ->references('id')->on('recruitment_hierarchies')
                ->onDelete('cascade');

            $table->foreign('indice_id')
                ->references('id')->on('recruitment_indices')
                ->onDelete('cascade');

            $table->unique(['hierarchy_id', 'indice_id', 'echelon', 'date_application'], 'bareme_unique');
        });
    }
};
