<?php

namespace App\Enums;

/**
 * 18 statuts officiels du §6 + 3 statuts d'exception (§6 « Cas d'exception »).
 * La méthode transitionsAutorisees() garantit qu'aucun saut d'étape n'est possible.
 */
enum EvalStatutFiche: string
{
    // ── Statuts officiels §6 (numérotés 1→18) ─────────────────────────────
    case Cree                   = 'cree';                    // 1  — SP1 : générée auto
    case TransmiseResponsable   = 'transmise_responsable';   // 2  — SP1 : diffusion auto
    case EntretienPlanifie      = 'entretien_planifie';      // 3  — SP2 : RH fixe date/lieu
    case AgentConvoque          = 'agent_convoque';          // 4  — SP2 : notification auto agent
    case EnCoursNotation        = 'en_cours_notation';       // 5  — SP3 : pendant l'entretien
    case NoteeDiscussion        = 'notee_attente_discussion';// 6  — SP3 : notation saisie
    case AttenteSignatureAgent  = 'attente_signature_agent'; // 7  — SP3 : envoi pour accord agent
    case Signee                 = 'signee';                  // 8  — SP3 : double signature obtenue
    case TransmiseDaf           = 'transmise_daf';           // 9  — SP3 : original envoyé DAF
    case ReceptioneeDaf         = 'receptionee_daf';         // 10 — SP4 : AR formel DAF
    case IntegreeeSynthese      = 'integree_synthese';       // 11 — SP4 : incluse dans tableau
    case TableauTransmisDg      = 'tableau_transmis_dg';     // 12 — SP4 : tableau envoyé DG
    case EtudieeeDg             = 'etudiee_dg';              // 13 — SP5 : DG prend connaissance
    case AnoteeDg               = 'annotee_dg';              // 14 — SP5 : DG annote + gratif
    case ValideeNotification    = 'validee_notification';    // 15 — SP5 : DG valide pour notif
    case CourrierEtabli         = 'courrier_etabli';         // 16 — SP6 : DAF établit courrier
    case Notifiee               = 'notifiee';                // 17 — SP6 : agent informé
    case Archivee               = 'archivee';                // 18 — fin : archivage définitif

    // ── Statuts d'exception §6 ────────────────────────────────────────────
    case SignatureRefusee        = 'signature_refusee';      // agent refuse de signer
    case EntretienReporte        = 'entretien_reporte';      // absent / indisponible
    case ClotureeeSortie         = 'cloturee_sortie';        // quitte l'ANASER en cours de campagne

    // ─────────────────────────────────────────────────────────────────────
    // Transitions autorisées (aucun saut d'étape possible)
    // ─────────────────────────────────────────────────────────────────────

    /** Retourne les statuts vers lesquels cette fiche peut transitionner. */
    public function transitionsAutorisees(): array
    {
        return match ($this) {
            // Statuts normaux
            self::Cree                  => [self::TransmiseResponsable, self::ClotureeeSortie],
            self::TransmiseResponsable  => [self::EntretienPlanifie, self::ClotureeeSortie],
            self::EntretienPlanifie     => [self::AgentConvoque, self::EntretienReporte, self::ClotureeeSortie],
            self::AgentConvoque         => [self::EnCoursNotation, self::EntretienReporte, self::ClotureeeSortie],
            self::EnCoursNotation       => [self::NoteeDiscussion, self::ClotureeeSortie],
            self::NoteeDiscussion       => [self::AttenteSignatureAgent, self::ClotureeeSortie],
            self::AttenteSignatureAgent => [self::Signee, self::SignatureRefusee, self::ClotureeeSortie],
            self::Signee                => [self::TransmiseDaf, self::ClotureeeSortie],
            self::TransmiseDaf          => [self::ReceptioneeDaf],
            self::ReceptioneeDaf        => [self::IntegreeeSynthese],
            self::IntegreeeSynthese     => [self::TableauTransmisDg],
            self::TableauTransmisDg     => [self::EtudieeeDg],
            self::EtudieeeDg            => [self::AnoteeDg],
            self::AnoteeDg              => [self::ValideeNotification],
            self::ValideeNotification   => [self::CourrierEtabli],
            self::CourrierEtabli        => [self::Notifiee],
            self::Notifiee              => [self::Archivee],

            // Cas d'exception
            self::SignatureRefusee  => [self::AttenteSignatureAgent, self::EntretienReporte],
            self::EntretienReporte  => [self::EntretienPlanifie],

            // Terminaux — aucune transition possible
            self::Archivee          => [],
            self::ClotureeeSortie   => [],
        };
    }

    /** Vérifie si la transition vers $cible est autorisée depuis ce statut. */
    public function peutTransitionnerVers(self $cible): bool
    {
        return in_array($cible, $this->transitionsAutorisees(), strict: true);
    }

    /** Indique si ce statut est terminal (aucune transition possible). */
    public function estTerminal(): bool
    {
        return $this->transitionsAutorisees() === [];
    }

    /** Retourne le libellé français officiel (CDC §6). */
    public function libelle(): string
    {
        return match ($this) {
            self::Cree                  => 'Créée',
            self::TransmiseResponsable  => 'Transmise au responsable hiérarchique',
            self::EntretienPlanifie     => 'Entretien planifié',
            self::AgentConvoque         => 'Agent informé de la convocation',
            self::EnCoursNotation       => 'En cours de notation',
            self::NoteeDiscussion       => 'Notée — en attente de discussion',
            self::AttenteSignatureAgent => 'En attente d\'accord de signature de l\'agent',
            self::Signee                => 'Signée',
            self::TransmiseDaf          => 'Transmise au DAF',
            self::ReceptioneeDaf        => 'Réceptionnée par le DAF / Division RH',
            self::IntegreeeSynthese     => 'Intégrée au tableau de synthèse',
            self::TableauTransmisDg     => 'Tableau transmis au DG',
            self::EtudieeeDg            => 'Étudiée par le DG/SG',
            self::AnoteeDg              => 'Annotée / gratification décidée',
            self::ValideeNotification   => 'Validée pour notification',
            self::CourrierEtabli        => 'Courrier de notification établi',
            self::Notifiee              => 'Notifiée à l\'agent',
            self::Archivee              => 'Archivée',
            self::SignatureRefusee      => 'Signature refusée',
            self::EntretienReporte      => 'Entretien reporté',
            self::ClotureeeSortie       => 'Clôturée sans notation — sortie d\'effectif',
        };
    }

    /** Retourne la sous-procédure d'appartenance (pour affichage). */
    public function sousProcedure(): string
    {
        return match ($this) {
            self::Cree, self::TransmiseResponsable                                          => 'SP1',
            self::EntretienPlanifie, self::AgentConvoque, self::EntretienReporte            => 'SP2',
            self::EnCoursNotation, self::NoteeDiscussion,
            self::AttenteSignatureAgent, self::SignatureRefusee,
            self::Signee, self::TransmiseDaf                                                => 'SP3',
            self::ReceptioneeDaf, self::IntegreeeSynthese, self::TableauTransmisDg         => 'SP4',
            self::EtudieeeDg, self::AnoteeDg, self::ValideeNotification                    => 'SP5',
            self::CourrierEtabli, self::Notifiee                                            => 'SP6',
            self::Archivee, self::ClotureeeSortie                                           => 'Clôture',
        };
    }

    /** Retourne tous les statuts dans l'ordre du cycle de vie. */
    public static function ordreCycleVie(): array
    {
        return [
            self::Cree,
            self::TransmiseResponsable,
            self::EntretienPlanifie,
            self::AgentConvoque,
            self::EnCoursNotation,
            self::NoteeDiscussion,
            self::AttenteSignatureAgent,
            self::Signee,
            self::TransmiseDaf,
            self::ReceptioneeDaf,
            self::IntegreeeSynthese,
            self::TableauTransmisDg,
            self::EtudieeeDg,
            self::AnoteeDg,
            self::ValideeNotification,
            self::CourrierEtabli,
            self::Notifiee,
            self::Archivee,
        ];
    }
}
