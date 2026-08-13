<?php

namespace Database\Factories;

use App\Models\EvalCritere;
use App\Models\EvalReferentiel;
use Illuminate\Database\Eloquent\Factories\Factory;

class EvalCritereFactory extends Factory
{
    protected $model = EvalCritere::class;

    public function definition(): array
    {
        static $ordre = 0;

        return [
            'referentiel_id' => EvalReferentiel::factory(),
            'code'           => 'C' . str_pad(++$ordre, 2, '0', STR_PAD_LEFT),
            'libelle'        => $this->faker->sentence(4),
            'type'           => 'socle',
            'ordre'          => $ordre,
            'actif'          => true,
        ];
    }

    public function socle(): static
    {
        return $this->state(['type' => 'socle']);
    }

    public function complementaire(): static
    {
        return $this->state(['type' => 'complementaire']);
    }

    public function inactif(): static
    {
        return $this->state(['actif' => false]);
    }
}
