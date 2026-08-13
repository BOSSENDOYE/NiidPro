<?php

namespace Database\Factories;

use App\Enums\EvalStatutFiche;
use App\Models\EvalCampagne;
use App\Models\EvalFiche;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EvalFicheFactory extends Factory
{
    protected $model = EvalFiche::class;

    public function definition(): array
    {
        return [
            'campagne_id'          => EvalCampagne::factory()->lancee(),
            'employee_id'          => Employee::factory(),
            'evaluateur_id'        => User::factory(),
            'statut'               => EvalStatutFiche::Cree,
            'categorie_agent'      => 'contractuel',
            'snapshot_matricule'   => 'EMP-' . $this->faker->numerify('####'),
            'snapshot_nom_complet' => $this->faker->name(),
            'snapshot_direction'   => $this->faker->company(),
            'snapshot_service'     => $this->faker->word(),
            'snapshot_fonction'    => $this->faker->jobTitle(),
            'snapshot_superieur'   => $this->faker->name(),
            'snapshot_anciennete_mois' => $this->faker->numberBetween(6, 240),
        ];
    }

    /** Fiche pour un agent mis à disposition (critères complémentaires applicables). */
    public function misADisposition(): static
    {
        return $this->state(['categorie_agent' => 'mis_a_disposition']);
    }

    /** Fiche à l'étape « entretien planifié ». */
    public function entretienPlanifie(): static
    {
        return $this->state([
            'statut'          => EvalStatutFiche::EntretienPlanifie,
            'date_entretien'  => now()->addDays(7),
            'heure_entretien' => '09:00',
            'lieu_entretien'  => 'Salle de réunion A',
            'type_entretien'  => 'presentiel',
        ]);
    }

    /** Fiche entièrement signée par les deux parties. */
    public function signee(): static
    {
        return $this->state([
            'statut'              => EvalStatutFiche::Signee,
            'date_entretien'      => now()->subDays(3),
            'entretien_tenu'      => true,
            'entretien_tenu_at'   => now()->subDays(3),
            'moyenne'             => $this->faker->randomFloat(2, 2.0, 5.0),
            'appreciation'        => $this->faker->randomElement(['satisfaisant', 'tres_satisfaisant', 'excellent']),
            'signe_evaluateur_at' => now()->subDay(),
            'signe_agent_at'      => now()->subDay(),
        ]);
    }

    /** Fiche en cas de refus de signature. */
    public function signatureRefusee(): static
    {
        return $this->state([
            'statut'                => EvalStatutFiche::SignatureRefusee,
            'refus_signature_agent' => true,
            'motif_refus_signature' => $this->faker->sentence(),
        ]);
    }

    /** Fiche archivée (cycle complet terminé). */
    public function archivee(): static
    {
        return $this->signee()->state([
            'statut'          => EvalStatutFiche::Archivee,
            'transmise_daf_at' => now()->subDays(10),
            'notifiee_at'     => now()->subDays(5),
            'archivee_at'     => now(),
        ]);
    }
}
