<?php

namespace App\Notifications;

use App\Models\EvalCourrier;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée à l'agent lorsque son courrier de notification
 * d'évaluation est transmis via le portail ou par email (SP6 §7.6).
 */
class EvalCourrierPublieNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly EvalCourrier $courrier) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        $fiche = $this->courrier->fiche;

        return [
            'type'        => 'eval_courrier_publie',
            'courrier_id' => $this->courrier->id,
            'fiche_id'    => $fiche?->id,
            'synthese_id' => $this->courrier->synthese_id,
            'exercice'    => $fiche?->campagne?->exercice,
            'mode_envoi'  => $this->courrier->mode_envoi,
            'message'     => "Votre lettre de notification d'évaluation est disponible sur votre espace personnel NiidPro.",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $fiche    = $this->courrier->fiche;
        $exercice = $fiche?->campagne?->exercice ?? '';

        $libelleMode = match ($this->courrier->mode_envoi) {
            'portail'     => 'Portail NiidPro (espace personnel)',
            'email'       => 'Messagerie électronique',
            'main_propre' => 'Remise en main propre',
            default       => $this->courrier->mode_envoi ?? '—',
        };

        return (new MailMessage)
            ->subject("NiidPro — Lettre de notification d'évaluation {$exercice}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Votre lettre de notification d'évaluation annuelle (exercice {$exercice}) a été établie et vous est transmise par la Direction Administrative et Financière.")
            ->line("Mode de transmission : {$libelleMode}.")
            ->line("Vous pouvez consulter votre courrier et accuser réception directement depuis votre espace personnel NiidPro.")
            ->salutation('Cordialement,' . PHP_EOL . 'Direction Administrative et Financière — ANASER');
    }
}
