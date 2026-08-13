<?php

namespace Database\Factories;

use App\Enums\EvalStatutCampagne;
use App\Models\EvalCampagne;
use App\Models\EvalReferentiel;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EvalCampagneFactory extends Factory
{
    protected $model = EvalCampagne::class;

    public function definition(): array
    {
        $exercice = (int) date('Y');

        return [
            'exercice'                  => $exercice,
            'titre'                     => "Campagne d'évaluation annuelle {$exercice}",
            'statut'                    => EvalStatutCampagne::Brouillon,
            'referentiel_id'            => EvalReferentiel::factory()->avecCriteresDefaut(),
            'date_lancement'            => now()->startOfMonth(),
            'date_limite_planification' => now()->addDays(15),
            'date_limite_entretiens'    => now()->addDays(45),
            'date_limite_transmission'  => now()->addDays(60),
            'date_limite_synthese'      => now()->addDays(75),
            'date_cloture'              => now()->endOfYear(),
            'periode_debut'             => now()->subYear()->startOfYear(),
            'periode_fin'               => now()->subYear()->endOfYear(),
            'cree_par'                  => User::factory(),
        ];
    }

    public function lancee(): static
    {
        return $this->state([
            'statut'                 => EvalStatutCampagne::Lancee,
            'note_service_signee'    => true,
            'note_service_signee_at' => now(),
            'lance_at'               => now(),
            'lance_par'              => User::factory(),
        ]);
    }

    public function enCours(): static
    {
        return $this->lancee()->state(['statut' => EvalStatutCampagne::EnCours]);
    }

    public function cloturee(): static
    {
        return $this->state([
            'statut'      => EvalStatutCampagne::Cloturee,
            'date_cloture' => now()->subDay(),
        ]);
    }
}
