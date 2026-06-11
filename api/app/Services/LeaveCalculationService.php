<?php

namespace App\Services;

use App\Models\DetailPlanningConge;
use App\Models\Employee;
use App\Models\JourFerie;
use App\Models\Leave;
use Carbon\Carbon;

class LeaveCalculationService
{
    // ────────────────────────────────────────────────────────────────
    //  RÈGLE VENDREDI : départ vendredi → 1er jour lundi
    //  "Le premier samedi n'est pas compté si le travailleur part le vendredi"
    // ────────────────────────────────────────────────────────────────
    public function adjustStartDate(Carbon $startDate): Carbon
    {
        if ($startDate->dayOfWeek === Carbon::FRIDAY) {
            return $startDate->copy()->addDays(3); // → lundi
        }
        return $startDate->copy();
    }

    // ────────────────────────────────────────────────────────────────
    //  NOTION DE JOURS OUVRABLES (Art. L.147 du Code du travail)
    //  Sont exclus du décompte :
    //   - le dimanche (repos hebdomadaire obligatoire, art. L.147) ;
    //   - les jours fériés légaux (Loi n° 74-52 du 4 novembre 1974).
    //  Les samedis sont comptés comme jours ouvrables, SAUF disposition
    //  contraire du règlement intérieur (config leaves.samedi_ouvrable).
    // ────────────────────────────────────────────────────────────────
    public function calculateLeaveDays(
        string $start,
        string $end,
        bool $applyFridayRule = true
    ): int {
        $startDate = Carbon::parse($start);
        $endDate   = Carbon::parse($end);

        if ($applyFridayRule) {
            $startDate = $this->adjustStartDate($startDate);
        }

        if ($startDate->gt($endDate)) {
            return 0;
        }

        $holidays      = $this->getHolidaysInRange(
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        );
        $samediOuvrable = (bool) config('leaves.samedi_ouvrable', true);

        $days    = 0;
        $current = $startDate->copy();

        while ($current->lte($endDate)) {
            $isSunday   = $current->dayOfWeek === Carbon::SUNDAY;
            $isSaturday = $current->dayOfWeek === Carbon::SATURDAY;
            $isHoliday  = in_array($current->format('Y-m-d'), $holidays);

            // Jour ouvrable = ni dimanche, ni férié, ni samedi exclu par le règlement
            if (! $isSunday && ! $isHoliday && ! ($isSaturday && ! $samediOuvrable)) {
                $days++;
            }
            $current->addDay();
        }

        return max(0, $days);
    }

    // ────────────────────────────────────────────────────────────────
    //  JOURS FÉRIÉS dans un intervalle
    // ────────────────────────────────────────────────────────────────
    public function getHolidaysInRange(string $from, string $to): array
    {
        $fromDate = Carbon::parse($from);
        $toDate   = Carbon::parse($to);
        $years    = range($fromDate->year, $toDate->year);

        // Fériés récurrents (mois/jour identiques chaque année)
        $fixed = [];
        $recurring = JourFerie::where('is_recurring', true)->get();
        foreach ($years as $year) {
            foreach ($recurring as $ferie) {
                try {
                    $date = Carbon::createFromDate($year, $ferie->mois, $ferie->jour)->format('Y-m-d');
                    if ($date >= $from && $date <= $to) {
                        $fixed[] = $date;
                    }
                } catch (\Exception) { /* date invalide (ex: 30 fév) */ }
            }
        }

        // Fériés variables (date précise)
        $variable = JourFerie::where('is_recurring', false)
            ->whereBetween('date', [$from, $to])
            ->pluck('date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        return array_unique(array_merge($fixed, $variable));
    }

    // ────────────────────────────────────────────────────────────────
    //  SUPPLÉMENT ANCIENNETÉ
    //  Table : <6 ans = 0j | 6-10 = 1j | 11-15 = 2j | 16-20 = 3j |
    //          21-25 = 4j | >25 = 5j
    // ────────────────────────────────────────────────────────────────
    public function getSeniorityBonus(Employee $employee, Carbon $asOf = null): int
    {
        $asOf     = $asOf ?? Carbon::now();
        $hire     = Carbon::parse($employee->hire_date);
        $years    = $hire->diffInYears($asOf) + ($employee->anciennete_recrutement ?? 0);

        return match (true) {
            $years >= 26 => 5,
            $years >= 21 => 4,
            $years >= 16 => 3,
            $years >= 11 => 2,
            $years >= 6  => 1,
            default      => 0,
        };
    }

    // ────────────────────────────────────────────────────────────────
    //  MAJORATION POUR MÈRES DE FAMILLE (Art. L.148 du Code du travail)
    //  Un (1) jour de congé supplémentaire par an pour chaque enfant de
    //  moins de 14 ans enregistré à l'état civil.
    //  Réservé aux mères (agents de sexe féminin).
    //  Source des enfants : onglet "Conjoints/Enfants" de la fiche agent
    //  (relation = Fils/Fille), l'âge est calculé d'après la date de naissance
    //  à la date de référence.
    // ────────────────────────────────────────────────────────────────
    public function getChildrenBonus(Employee $employee, ?Carbon $asOf = null): int
    {
        $gender   = strtolower($employee->gender ?? '');
        $isFemale = in_array($gender, ['f', 'femme', 'female', 'féminin']);

        if (! $isFemale) {
            return 0;
        }

        $asOf      = $asOf ?? Carbon::now();
        $ageMax    = (int) config('leaves.mere_famille_age_max', 14);
        $parEnfant = (int) config('leaves.mere_famille_jours_enfant', 1);

        $eligibles = $employee->children
            ->filter(function ($child) use ($asOf, $ageMax) {
                if (! $child->birth_date) {
                    return false;
                }
                return Carbon::parse($child->birth_date)->diffInYears($asOf) < $ageMax;
            })
            ->count();

        return $eligibles * $parEnfant;
    }

    // ────────────────────────────────────────────────────────────────
    //  SUPPLÉMENT MÉDAILLE DE TRAVAIL
    // ────────────────────────────────────────────────────────────────
    public function getMedailleBonus(Employee $employee): int
    {
        return $employee->a_medaille_travail ? 1 : 0;
    }

    // ────────────────────────────────────────────────────────────────
    //  ACCRUAL MENSUEL
    //  = mois écoulés depuis dernier calcul × nbre_jour_conge (défaut 2)
    // ────────────────────────────────────────────────────────────────
    public function getMonthlyAccrual(
        Employee $employee,
        Carbon $fromDate,
        Carbon $toDate
    ): float {
        $months = (float) $fromDate->diffInMonths($toDate);
        return $months * ($employee->nbre_jour_conge ?? 2);
    }

    // ────────────────────────────────────────────────────────────────
    //  SOLDE COMPLET (détail par composante)
    // ────────────────────────────────────────────────────────────────
    public function getBalance(Employee $employee, Carbon $upToDate = null): array
    {
        $upToDate = $upToDate ?? Carbon::now();
        $lastCalc = $employee->date_dernier_calcul_conge
            ? Carbon::parse($employee->date_dernier_calcul_conge)
            : Carbon::parse($employee->hire_date);

        $accrued   = $this->getMonthlyAccrual($employee, $lastCalc, $upToDate);
        $seniority = $this->getSeniorityBonus($employee, $upToDate);
        $children  = $this->getChildrenBonus($employee, $upToDate);
        $medaille  = $this->getMedailleBonus($employee);

        $base = (float) ($employee->nbre_jour_restant ?? 0);

        // Congés approuvés depuis le dernier calcul
        $usedSinceLastCalc = Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where('start_date', '>=', $lastCalc->format('Y-m-d'))
            ->sum('days_count');

        $totalBrut  = $base + $accrued + $seniority + $children + $medaille;
        $available  = max(0, $totalBrut - $usedSinceLastCalc);

        return [
            'employee_id'           => $employee->id,
            'employee_name'         => $employee->full_name,
            'base_restant'          => round($base, 1),
            'acquis_periode'        => round($accrued, 1),
            'supplement_anciennete' => $seniority,
            'supplement_enfant'     => $children,
            'supplement_medaille'   => $medaille,
            'total_brut'            => round($totalBrut, 1),
            'jours_utilises'        => (float) $usedSinceLastCalc,
            'solde_disponible'      => round($available, 1),
            'last_calculation'      => $lastCalc->format('Y-m-d'),
            'computed_at'           => $upToDate->format('Y-m-d'),
            'anciennete_years'      => Carbon::parse($employee->hire_date)->diffInYears($upToDate)
                                       + ($employee->anciennete_recrutement ?? 0),
        ];
    }

    // ────────────────────────────────────────────────────────────────
    //  VALIDATION RÈGLES MÉTIER AVANT SOUMISSION
    // ────────────────────────────────────────────────────────────────
    public function validateLeaveRequest(
        Employee $employee,
        string $startDate,
        string $endDate,
        int $daysCount
    ): array {
        $errors  = [];
        $balance = $this->getBalance($employee);

        // 1. Solde suffisant
        if ($daysCount > $balance['solde_disponible']) {
            $errors[] = "Solde insuffisant : {$balance['solde_disponible']} jour(s) disponible(s), {$daysCount} demandé(s).";
        }

        // 2. Min 12j / Max 24j consécutifs (période légale)
        if ($daysCount > 24) {
            $errors[] = "Durée maximale de 24 jours ouvrables consécutifs dépassée (Code du travail, art. L185).";
        }

        // 3. Chevauchement avec période légale si > 24j
        // (Avertissement uniquement, pas bloquant)
        $start = Carbon::parse($startDate);
        $end   = Carbon::parse($endDate);
        $legalStart = Carbon::createFromDate($start->year, 5, 1);
        $legalEnd   = Carbon::createFromDate($start->year, 10, 31);

        $inLegalPeriod = $start->between($legalStart, $legalEnd)
                      || $end->between($legalStart, $legalEnd);

        return [
            'valid'            => empty($errors),
            'errors'           => $errors,
            'balance'          => $balance,
            'in_legal_period'  => $inLegalPeriod,
            'friday_rule'      => $start->dayOfWeek === Carbon::FRIDAY,
            'adjusted_start'   => $start->dayOfWeek === Carbon::FRIDAY
                                  ? $this->adjustStartDate($start)->format('Y-m-d')
                                  : $startDate,
        ];
    }

    // ────────────────────────────────────────────────────────────────
    //  GÉNÉRATION PLANNING POUR UN AGENT
    //  Insère/MAJ dans detail_planning_conges
    // ────────────────────────────────────────────────────────────────
    public function generatePlanningForEmployee(
        Employee $employee,
        int $year,
        Carbon $dateGeneration,
        Carbon $dateLimite,
        ?int $userId = null,
        string $critere = 'G'
    ): DetailPlanningConge {
        $lastCalc = $employee->date_dernier_calcul_conge
            ? Carbon::parse($employee->date_dernier_calcul_conge)
            : Carbon::parse($employee->hire_date);

        $nbreJourDispo  = (float) ($employee->nbre_jour_restant ?? 0);
        $nbreJourConges = $this->getMonthlyAccrual($employee, $lastCalc, $dateLimite);
        $suppAnciennete = $this->getSeniorityBonus($employee, $dateLimite);
        $suppEnfant     = $this->getChildrenBonus($employee, $dateLimite);
        $suppMedaille   = $this->getMedailleBonus($employee);

        // Jours approuvés depuis le dernier calcul → à imputer
        $nbreJourAImputer = (float) Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where('start_date', '>=', $lastCalc->format('Y-m-d'))
            ->where('start_date', '<=', $dateLimite->format('Y-m-d'))
            ->sum('days_count');

        $total = max(0,
            $nbreJourDispo
            + $nbreJourConges
            + $suppAnciennete
            + $suppEnfant
            + $suppMedaille
            - $nbreJourAImputer
        );

        return DetailPlanningConge::updateOrCreate(
            [
                'employee_id'     => $employee->id,
                'annee'           => $year,
                'date_generation' => $dateGeneration->format('Y-m-d'),
            ],
            [
                'critere'                    => $critere,
                'date_limite'                => $dateLimite->format('Y-m-d'),
                'nbre_jour_dispo'            => round($nbreJourDispo, 1),
                'supplement_enfant'          => $suppEnfant,
                'supplement_anciennete'      => $suppAnciennete,
                'supplement_medaille'        => $suppMedaille,
                'nbre_jour_conges'           => round($nbreJourConges, 1),
                'nbre_jour_a_imputer'        => round($nbreJourAImputer, 1),
                'nbre_jour_total_disponible' => round($total, 1),
                'utilisateur_cre'            => $userId,
                'statut'                     => 'valide',
            ]
        );
    }

    // ────────────────────────────────────────────────────────────────
    //  METTRE À JOUR LE SOLDE APRÈS APPROBATION / ANNULATION
    // ────────────────────────────────────────────────────────────────
    public function deductBalance(Employee $employee, int $days): void
    {
        $employee->decrement('nbre_jour_restant', $days);
    }

    public function restoreBalance(Employee $employee, int $days): void
    {
        $employee->increment('nbre_jour_restant', $days);
    }
}
