<?php

namespace App\Notifications;

use App\Models\EvalFiche;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification générique sur changement de statut d'une fiche (§10.1).
 * Envoyée aux parties concernées par le changement (évaluateur, agent, DAF…).
 */
class EvalStatutChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly EvalFiche $fiche,
        public readonly string    $message,
        public readonly string    $typeEvenement = 'eval_statut_change',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => $this->typeEvenement,
            'fiche_id'      => $this->fiche->id,
            'campagne_id'   => $this->fiche->campagne_id,
            'exercice'      => $this->fiche->campagne?->exercice,
            'agent'         => $this->fiche->snapshot_nom_complet,
            'statut'        => $this->fiche->statut->value,
            'statut_libelle'=> $this->fiche->statut->libelle(),
            'message'       => $this->message,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $exercice = $this->fiche->campagne?->exercice ?? '';

        return (new MailMessage)
            ->subject("NiidPro — Évaluation {$exercice} : " . $this->fiche->statut->libelle())
            ->greeting("Bonjour {$notifiable->name},")
            ->line($this->message)
            ->line("Agent concerné : **{$this->fiche->snapshot_nom_complet}**")
            ->line("Statut actuel : {$this->fiche->statut->libelle()}")
            ->salutation('Cordialement, NiidPro SIRH — ANASER');
    }
}
