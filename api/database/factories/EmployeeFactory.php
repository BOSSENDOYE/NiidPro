<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'user_id'           => User::factory(),
            'first_name'        => $this->faker->firstName(),
            'last_name'         => $this->faker->lastName(),
            'hire_date'         => $this->faker->dateTimeBetween('-10 years', '-1 year'),
            'status'            => 'active',
            'categorie_emploi'  => $this->faker->randomElement(['contractuel', 'fonctionnaire', 'decisionnaire']),
        ];
    }

    public function misADisposition(): static
    {
        return $this->state(['categorie_emploi' => 'fonctionnaire']);
    }
}
