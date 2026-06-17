<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\Employee;
use App\Models\Position;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ContractSeeder extends Seeder
{
    public function run(): void
    {
        // Salaires de base par code de poste
        $salaires = [
            'P-CS'       => 950000,
            'P-DG'       => 850000,
            'P-SG'       => 680000,
            'P-DEP'      => 530000,
            'P-DAC'      => 530000,
            'P-DPSRC'    => 530000,
            'P-DDC'      => 530000,
            'P-DAF'      => 530000,
            'P-ACC'      => 460000,
            'P-ODSR'     => 420000,
            'P-EP'       => 420000,
            'P-DAHI'     => 420000,
            'P-CH'       => 420000,
            'P-CSEV'     => 420000,
            'P-EPR'      => 420000,
            'P-COOP'     => 350000,
            'P-DT'       => 350000,
            'P-FIN'      => 400000,
            'P-RH'       => 400000,
            'P-CE'       => 310000,
            'P-CC'       => 310000,
            'P-AD'       => 260000,
            'P-CONSTECH' => 390000,
            'P-CHEF-BUR' => 310000,
            'P-COURSIER' => 175000,
            'P-CHAUFFEUR'=> 195000,
            'P-RECEPT'   => 185000,
            'P-ECON'     => 345000,
            'P-COORD'    => 370000,
            'P-SECR'     => 215000,
            'P-AGT-TECH' => 240000,
            'P-AGT-ADM'  => 225000,
            'P-MAGASIN'  => 195000,
            'P-CH-POLE'  => 370000,
        ];

        $positionsByCode = Position::pluck('id', 'code');
        $employees = Employee::with('position')->whereIn('status', ['active', 'inactive'])->get();

        foreach ($employees as $emp) {
            $posCode    = $positionsByCode->flip()[$emp->position_id] ?? null;
            $salaire    = $posCode ? ($salaires[$posCode] ?? 250000) : 250000;
            $contractType = $this->guessContractType($emp);
            $hireDate   = Carbon::parse($emp->hire_date ?? '2018-01-01');

            // ── Mise à jour du contrat actif existant ────────────────────────
            $active = Contract::where('employee_id', $emp->id)->where('is_active', true)->first();
            if ($active) {
                $active->update([
                    'salary'                 => $salaire,
                    'working_hours_per_week' => 40,
                    'trial_period_end'       => in_array($contractType, ['CDI', 'CDD'])
                        ? $hireDate->copy()->addMonths(3)->format('Y-m-d')
                        : null,
                    'notes' => $this->notes($contractType),
                ]);
            } else {
                // Créer un contrat actif s'il n'en a pas
                $endDate = $contractType === 'CDD'
                    ? Carbon::now()->addMonths(rand(2, 18))->format('Y-m-d')
                    : null;

                Contract::create([
                    'employee_id'            => $emp->id,
                    'type'                   => $contractType,
                    'start_date'             => $hireDate->format('Y-m-d'),
                    'end_date'               => $endDate,
                    'salary'                 => $salaire,
                    'working_hours_per_week' => 40,
                    'trial_period_end'       => in_array($contractType, ['CDI', 'CDD'])
                        ? $hireDate->copy()->addMonths(3)->format('Y-m-d')
                        : null,
                    'notes'                  => $this->notes($contractType),
                    'is_active'              => true,
                ]);
            }

            // ── Contrat CDD : ajouter une date de fin ────────────────────────
            if (in_array($contractType, ['CDD', 'Stage', 'Alternance', 'Prestation'])) {
                $months   = match ($contractType) {
                    'Stage'       => 6,
                    'Alternance'  => 12,
                    'Prestation'  => 3,
                    default       => 12,
                };
                $endDate  = $hireDate->copy()->addMonths($months)->format('Y-m-d');
                Contract::where('employee_id', $emp->id)->where('is_active', true)
                    ->update(['end_date' => $endDate]);
            }
        }

        // ── Contrats CDD expirant bientôt (dans 30 jours) ───────────────────
        $cddEmployees = Employee::where('status', 'active')->inRandomOrder()->take(5)->get();
        foreach ($cddEmployees as $emp) {
            Contract::where('employee_id', $emp->id)->update(['is_active' => false]);
            $start = Carbon::now()->subMonths(11);
            Contract::create([
                'employee_id'            => $emp->id,
                'type'                   => 'CDD',
                'start_date'             => $start->format('Y-m-d'),
                'end_date'               => Carbon::now()->addDays(rand(5, 25))->format('Y-m-d'),
                'salary'                 => rand(200, 500) * 1000,
                'working_hours_per_week' => 40,
                'trial_period_end'       => $start->copy()->addMonths(1)->format('Y-m-d'),
                'notes'                  => 'Renouvellement en cours d\'examen.',
                'is_active'              => true,
            ]);
        }

        // ── Contrats historiques (terminés) pour quelques agents ────────────
        $historique = Employee::where('status', 'active')->inRandomOrder()->take(10)->get();
        foreach ($historique as $emp) {
            $start = Carbon::parse($emp->hire_date ?? '2015-01-01')->subYears(rand(2, 5));
            Contract::firstOrCreate(
                ['employee_id' => $emp->id, 'is_active' => false],
                [
                    'type'                   => 'CDD',
                    'start_date'             => $start->format('Y-m-d'),
                    'end_date'               => $start->copy()->addYear()->format('Y-m-d'),
                    'salary'                 => rand(150, 350) * 1000,
                    'working_hours_per_week' => 40,
                    'notes'                  => 'Premier contrat — non renouvelé.',
                    'is_active'              => false,
                ]
            );
        }

        // ── Contrats Stage pour quelques nouveaux agents ─────────────────────
        $stagiaires = Employee::where('status', 'active')->inRandomOrder()->take(3)->get();
        foreach ($stagiaires as $emp) {
            $start = Carbon::now()->subMonths(rand(1, 4));
            Contract::firstOrCreate(
                ['employee_id' => $emp->id, 'type' => 'Stage'],
                [
                    'start_date'             => $start->format('Y-m-d'),
                    'end_date'               => $start->copy()->addMonths(6)->format('Y-m-d'),
                    'salary'                 => rand(100, 180) * 1000,
                    'working_hours_per_week' => 35,
                    'notes'                  => 'Stage de fin d\'études.',
                    'is_active'              => true,
                ]
            );
        }

        $total = Contract::count();
        $actifs = Contract::where('is_active', true)->count();
        $expirés = Contract::where('is_active', true)->whereNotNull('end_date')
            ->where('end_date', '<=', Carbon::now()->addDays(30))->count();

        $this->command->info("✓ Contrats : $total au total, $actifs actifs dont $expirés expirant dans 30 jours.");
    }

    private function guessContractType(Employee $emp): string
    {
        // On se base sur le type déjà en base s'il existe
        $existing = Contract::where('employee_id', $emp->id)->first();
        if ($existing && in_array($existing->type, ['CDI', 'CDD', 'DECRET', 'DETACHEMENT', 'Stage', 'Alternance', 'Prestation', 'Autre'])) {
            return $existing->type;
        }
        return 'CDI';
    }

    private function notes(string $type): string
    {
        return match ($type) {
            'DECRET'      => 'Nommé par décret présidentiel. Poste de confiance de l\'État.',
            'DETACHEMENT' => 'Agent en position de détachement depuis une administration partenaire.',
            'CDD'         => 'Contrat à durée déterminée — renouvelable sous conditions.',
            'Stage'       => 'Stage conventionné avec un établissement d\'enseignement supérieur.',
            'Alternance'  => 'Contrat d\'alternance — formation professionnelle.',
            'Prestation'  => 'Prestation de service — mission ponctuelle.',
            default       => 'Contrat à durée indéterminée — personnel permanent.',
        };
    }
}
