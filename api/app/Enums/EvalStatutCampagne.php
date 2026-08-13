<?php

namespace App\Enums;

enum EvalStatutCampagne: string
{
    case Brouillon   = 'brouillon';    // configuration en cours, non lancée
    case Lancee      = 'lancee';       // note de service signée, fiches générées (SP1 terminée)
    case EnCours     = 'en_cours';     // entretiens en cours (SP2–SP3)
    case Synthese    = 'synthese';     // fiches au DAF, tableau en cours (SP4)
    case Decision    = 'decision';     // tableau chez DG pour étude/décision (SP5)
    case Notification = 'notification';// DG a validé, DAF notifie les agents (SP6)
    case Cloturee    = 'cloturee';     // 100 % agents notifiés, archivage terminé

    public function libelle(): string
    {
        return match ($this) {
            self::Brouillon    => 'Brouillon',
            self::Lancee       => 'Lancée',
            self::EnCours      => 'En cours',
            self::Synthese     => 'Synthèse',
            self::Decision     => 'Décision DG',
            self::Notification => 'Notification',
            self::Cloturee     => 'Clôturée',
        };
    }

    public function transitionsAutorisees(): array
    {
        return match ($this) {
            self::Brouillon    => [self::Lancee],
            self::Lancee       => [self::EnCours],
            self::EnCours      => [self::Synthese],
            self::Synthese     => [self::Decision],
            self::Decision     => [self::Notification],
            self::Notification => [self::Cloturee],
            self::Cloturee     => [],
        };
    }
}
