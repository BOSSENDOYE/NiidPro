<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detail_planning_conges', function (Blueprint $table) {
            $table->date('date_depart_prevu')->nullable()->after('date_limite')
                ->comment('Date de départ prévue dans le planning annuel');
            $table->date('date_retour_prevu')->nullable()->after('date_depart_prevu')
                ->comment('Date de retour prévue');
            $table->decimal('nbre_jours_programme', 6, 1)->nullable()->after('date_retour_prevu')
                ->comment('Nombre de jours de congé programmés');
            $table->enum('statut_realisation', ['planifié', 'confirmé', 'réalisé', 'non_respecté'])
                ->default('planifié')->after('nbre_jours_programme');
            $table->timestamp('derniere_notif_at')->nullable()->after('statut_realisation')
                ->comment('Dernière notification envoyée (alerte départ imminent)');
            $table->foreignId('leave_id')->nullable()->after('derniere_notif_at')
                ->constrained('leaves')->nullOnDelete()
                ->comment('Demande de congé réellement soumise liée à ce planning');
        });
    }

    public function down(): void
    {
        Schema::table('detail_planning_conges', function (Blueprint $table) {
            $table->dropForeign(['leave_id']);
            $table->dropColumn([
                'date_depart_prevu', 'date_retour_prevu', 'nbre_jours_programme',
                'statut_realisation', 'derniere_notif_at', 'leave_id',
            ]);
        });
    }
};
