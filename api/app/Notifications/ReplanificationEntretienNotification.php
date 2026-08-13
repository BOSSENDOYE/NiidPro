<?php

namespace App\Notifications;

use App\Models\EvalFiche;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReplanificationEntretienNotification extends Notification
{
    use Queueable;

    public function __construct(
        private EvalFiche $fiche,
        private string $ancienneDate,
        private string $motif,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'                => 'replanification_entretien',
            'fiche_id'            => $this->fiche->id,
            'campagne_id'         => $this->fiche->campagne_id,
            'campagne'            => $this->fiche->campagne?->titre,
            'ancienne_date'       => $this->ancienneDate,
            'nouvelle_date'       => $this->fiche->date_entretien?->format('Y-m-d'),
            'heure_entretien'     => $this->fiche->heure_entretien,
            'lieu_entretien'      => $this->fiche->lieu_entretien,
            'motif'               => $this->motif,
            'nb_replanifications' => $this->fiche->nb_replanifications,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $titre         = $this->fiche->campagne?->titre ?? 'Campagne d\'évaluation';
        $nouvelleDateStr = $this->fiche->date_entretien
            ? $this->fiche->date_entretien->locale('fr')->isoFormat('dddd D MMMM YYYY')
            : 'à confirmer';
        $heure         = $this->fiche->heure_entretien ?? 'à confirmer';
        $lieu          = $this->fiche->lieu_entretien ?? 'à confirmer';

        return (new MailMessage)
            ->subject("Replanification — Entretien d'évaluation annuelle")
            ->greeting('Bonjour,')
            ->line("Votre entretien d'évaluation annuelle ({$titre}) a été **replanifié**.")
            ->line("**Motif :** {$this->motif}")
            ->line("**Nouvelle date :** {$nouvelleDateStr}")
            ->line("**Heure :** {$heure}")
            ->line("**Lieu :** {$lieu}")
            ->line('Veuillez consulter la plateforme NiidPro pour accuser réception de cette nouvelle convocation.')
            ->salutation('La Direction des Ressources Humaines — ANASER');
    }

    public function toArray(object $notifiable): array
    {
        return $this->toDatabase($notifiable);
    }
}
