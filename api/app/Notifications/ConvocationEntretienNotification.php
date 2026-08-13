<?php

namespace App\Notifications;

use App\Models\EvalFiche;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ConvocationEntretienNotification extends Notification
{
    use Queueable;

    public function __construct(private EvalFiche $fiche) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'            => 'convocation_entretien',
            'fiche_id'        => $this->fiche->id,
            'campagne_id'     => $this->fiche->campagne_id,
            'campagne'        => $this->fiche->campagne?->titre,
            'exercice'        => $this->fiche->campagne?->exercice,
            'date_entretien'  => $this->fiche->date_entretien?->format('Y-m-d'),
            'heure_entretien' => $this->fiche->heure_entretien,
            'lieu_entretien'  => $this->fiche->lieu_entretien,
            'type_entretien'  => $this->fiche->type_entretien,
            'evaluateur'      => $this->fiche->evaluateur?->name,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $titre    = $this->fiche->campagne?->titre ?? 'Campagne d\'évaluation';
        $dateStr  = $this->fiche->date_entretien
            ? $this->fiche->date_entretien->locale('fr')->isoFormat('dddd D MMMM YYYY')
            : 'à confirmer';
        $heure    = $this->fiche->heure_entretien ?? 'à confirmer';
        $lieu     = $this->fiche->lieu_entretien ?? 'à confirmer';
        $evaluateur = $this->fiche->evaluateur?->name ?? 'votre responsable';

        return (new MailMessage)
            ->subject("Convocation — Entretien d'évaluation annuelle")
            ->greeting('Bonjour,')
            ->line("Vous êtes convoqué(e) à votre entretien d'évaluation annuelle dans le cadre de la **{$titre}**.")
            ->line("**Date :** {$dateStr}")
            ->line("**Heure :** {$heure}")
            ->line("**Lieu :** {$lieu}")
            ->line("**Évaluateur :** {$evaluateur}")
            ->line('Veuillez consulter la plateforme NiidPro pour accuser réception de cette convocation.')
            ->salutation('La Direction des Ressources Humaines — ANASER');
    }

    public function toArray(object $notifiable): array
    {
        return $this->toDatabase($notifiable);
    }
}
