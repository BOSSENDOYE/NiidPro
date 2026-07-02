<?php

namespace App\Services;

use App\Models\RecruitmentBareme;

class IrppCalculatorService
{
    private const COLUMN_MAP = [
        '1'   => 'part_1',
        '1.5' => 'part_1_5',
        '2'   => 'part_2',
        '2.5' => 'part_2_5',
        '3'   => 'part_3',
        '3.5' => 'part_3_5',
        '4'   => 'part_4',
        '4.5' => 'part_4_5',
        '5'   => 'part_5',
    ];

    /**
     * Calcule l'IRPP et le TRIMF selon le barème sénégalais.
     *
     * @param  float  $partIr          Part fiscale de l'agent (1 à 5, pas de 0.5)
     * @param  int    $salBrutSocial   Salaire brut social (SMI + CSS_S + IndRes + augmentations)
     * @param  int    $indemRisqueSante Indemnité risques/santé (déduire du brut social)
     * @param  int    $transport       Indemnité de transport (déduire du brut social)
     * @param  float  $partTrimf       Part TRIMF de l'agent (multiplicateur)
     */
    public function calculate(
        float $partIr,
        int   $salBrutSocial,
        int   $indemRisqueSante,
        int   $transport,
        float $partTrimf
    ): array {
        $montantImposable = $salBrutSocial - $indemRisqueSante - $transport;

        if ($montantImposable <= 0 || $montantImposable > 5_000_000) {
            return [
                'trinf'        => 0,
                'impo_sur_revn' => 0,
                'montant_irpp' => max(0, $montantImposable),
            ];
        }

        // Tranche de 1 000 inférieure (même logique que le découpage WinDev)
        $cle = intdiv((int) $montantImposable, 1000) * 1000;

        $colonne = self::COLUMN_MAP[(string) $partIr] ?? null;
        if (! $colonne) {
            return ['trinf' => 0, 'impo_sur_revn' => 0, 'montant_irpp' => $montantImposable];
        }

        $bareme = RecruitmentBareme::where('revenu_brut', $cle)->first();
        if (! $bareme) {
            return ['trinf' => 0, 'impo_sur_revn' => 0, 'montant_irpp' => $montantImposable];
        }

        return [
            'trinf'        => (int) round((float) $bareme->trimf_pers * $partTrimf),
            'impo_sur_revn' => (int) round((float) $bareme->$colonne),
            'montant_irpp' => $montantImposable,
        ];
    }
}
