<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Services\LeaveCalculationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * GENERATION_CONGE_ANNUEL(DATE_GENERATION, DATE_LIMITE, ANNEE, critere)
 * Critères :
 *   G = Global (toute l'agence)
 *   E = Entité (une direction/département)
 *   A = Agent  (un seul agent par matricule)
 */
class GenerateLeavePlanningCommand extends Command
{
    protected $signature = 'leave:generate
        {critere          : G=Global | E=Entité | A=Agent}
        {annee            : Année de génération (ex: 2026)}
        {--entity=        : ID du département (si critere=E)}
        {--employee=      : Matricule de l\'agent (si critere=A)}
        {--date-generation= : Date de génération Y-m-d (défaut: aujourd\'hui)}
        {--date-limite=     : Date limite Y-m-d (défaut: 31 octobre de l\'année)}';

    protected $description = 'Génère le planning de congés annuel ANASER';

    public function __construct(private LeaveCalculationService $calculator)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $critere  = strtoupper($this->argument('critere'));
        $annee    = (int) $this->argument('annee');

        $dateGen  = $this->option('date-generation')
            ? Carbon::parse($this->option('date-generation'))
            : Carbon::today();

        $dateLimite = $this->option('date-limite')
            ? Carbon::parse($this->option('date-limite'))
            : Carbon::createFromDate($annee, 10, 31);

        $this->newLine();
        $this->line('╔══════════════════════════════════════════════╗');
        $this->line('║    GÉNÉRATION PLANNING CONGÉS — ANASER       ║');
        $this->line('╚══════════════════════════════════════════════╝');
        $this->newLine();
        $this->table(
            ['Paramètre', 'Valeur'],
            [
                ['Critère',          $critere],
                ['Année',            $annee],
                ['Date génération',  $dateGen->format('d/m/Y')],
                ['Date limite',      $dateLimite->format('d/m/Y')],
            ]
        );

        $employees = $this->resolveEmployees($critere);

        if ($employees->isEmpty()) {
            $this->warn('⚠ Aucun agent actif trouvé selon le critère sélectionné.');
            return 1;
        }

        $this->info("→ {$employees->count()} agent(s) à traiter");
        $this->newLine();

        $bar       = $this->output->createProgressBar($employees->count());
        $generated = 0;
        $errors    = [];

        foreach ($employees as $employee) {
            try {
                $this->calculator->generatePlanningForEmployee(
                    $employee,
                    $annee,
                    $dateGen,
                    $dateLimite,
                    null,
                    $critere
                );
                $generated++;
            } catch (\Throwable $e) {
                $errors[] = "{$employee->employee_number}: {$e->getMessage()}";
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        if ($generated > 0) {
            $this->info("✓ {$generated} planning(s) généré(s) avec succès.");
        }
        if (! empty($errors)) {
            $this->error("✗ " . count($errors) . " erreur(s) :");
            foreach ($errors as $err) {
                $this->line("  - {$err}");
            }
        }

        return empty($errors) ? 0 : 1;
    }

    private function resolveEmployees(string $critere)
    {
        $query = Employee::where('status', 'active');

        return match ($critere) {
            'E'     => $query->where('department_id', $this->option('entity'))->get(),
            'A'     => $query->where('employee_number', $this->option('employee'))->get(),
            default => $query->get(), // G
        };
    }
}
