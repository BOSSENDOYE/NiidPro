<?php

namespace Database\Factories;

use App\Models\EvalReferentiel;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EvalReferentielFactory extends Factory
{
    protected $model = EvalReferentiel::class;

    public function definition(): array
    {
        return [
            'code'     => 'ANASER',
            'version'  => 1,
            'libelle'  => 'Référentiel d\'évaluation ANASER',
            'note_min' => 1,
            'note_max' => 5,
            'verrouille' => false,
            'cree_par' => User::factory(),
        ];
    }

    /** Référentiel pré-rempli avec les 13 critères officiels du CDC §4.1. */
    public function avecCriteresDefaut(): static
    {
        return $this->afterCreating(function (EvalReferentiel $referentiel) {
            $socles = [
                ['C01', 'Assiduité au travail et conduite'],
                ['C02', 'Ponctualité'],
                ['C03', 'Célérité dans l\'accomplissement des tâches'],
                ['C04', 'Esprit d\'initiative'],
                ['C05', 'Sens des responsabilités'],
                ['C06', 'Relations humaines'],
                ['C07', 'Engagement dans les projets, programmes et activités de l\'ANASER'],
            ];

            $complementaires = [
                ['C08', 'Conscience professionnelle'],
                ['C09', 'Bonne conduite'],
                ['C10', 'Respect du secret professionnel'],
                ['C11', 'Tâches dévolues à l\'agent'],
                ['C12', 'Sens de l\'engagement'],
                ['C13', 'Respect de l\'autorité et de la hiérarchie'],
            ];

            foreach ($socles as $i => [$code, $libelle]) {
                $referentiel->criteres()->create([
                    'code'    => $code,
                    'libelle' => $libelle,
                    'type'    => 'socle',
                    'ordre'   => $i + 1,
                    'actif'   => true,
                ]);
            }

            foreach ($complementaires as $i => [$code, $libelle]) {
                $referentiel->criteres()->create([
                    'code'    => $code,
                    'libelle' => $libelle,
                    'type'    => 'complementaire',
                    'ordre'   => count($socles) + $i + 1,
                    'actif'   => true,
                ]);
            }
        });
    }

    /** Référentiel verrouillé (simulé comme après lancement de campagne). */
    public function verrouille(): static
    {
        return $this->state([
            'verrouille'    => true,
            'verrouille_at' => now(),
            'verrouille_par' => User::factory(),
        ]);
    }
}
