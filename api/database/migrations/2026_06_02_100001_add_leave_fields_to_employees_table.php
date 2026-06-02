<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Paramètres de calcul des droits à congé
            $table->unsignedTinyInteger('nbre_jour_conge')->default(2)->after('annual_leave_days')
                ->comment('Nombre de jours acquis par mois travaillé (défaut 2)');

            $table->decimal('nbre_jour_restant', 6, 1)->default(0)->after('nbre_jour_conge')
                ->comment('Solde de congés restants');

            $table->date('date_dernier_calcul_conge')->nullable()->after('nbre_jour_restant')
                ->comment('Date du dernier calcul du solde');

            $table->unsignedSmallInteger('anciennete_recrutement')->default(0)->after('date_dernier_calcul_conge')
                ->comment('Années d\'ancienneté comptabilisées avant l\'entrée dans cet organisme');

            // Suppléments (femmes)
            $table->unsignedTinyInteger('nombre_enfants_charge')->default(0)->after('anciennete_recrutement')
                ->comment('Nombre d\'enfants à charge (donne droit à +2j/enfant pour les femmes)');

            $table->boolean('a_medaille_travail')->default(false)->after('nombre_enfants_charge')
                ->comment('Agent décoré d\'une médaille de travail (droit à jours supplémentaires)');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'nbre_jour_conge', 'nbre_jour_restant', 'date_dernier_calcul_conge',
                'anciennete_recrutement', 'nombre_enfants_charge', 'a_medaille_travail',
            ]);
        });
    }
};
