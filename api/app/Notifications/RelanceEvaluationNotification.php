<?php

namespace App\Notifications;

use App\Models\EvalCampagne;
use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RelanceEvaluationNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly EvalCampagne $campagne,
        private readonly Employee     $agentManquant,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'         => 'relance_evaluation',
            'campagne_id'  => $this->campagne->id,
            'exercice'     => $this->campagne->exercice,
            'agent_id'     => $this->agentManquant->id,
            'agent_nom'    => $this->agentManquant->first_name . ' ' . $this->agentManquant->last_name,
            'message'      => "La fiche d'évaluation de {$this->agentManquant->first_name} {$this->agentManquant->last_name} n'a pas encore été transmise au DAF.",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $nom = $this->agentManquant->first_name . ' ' . $this->agentManquant->last_name;

        return (new MailMessage())
            ->subject("Relance — Fiche d'évaluation manquante ({$this->campagne->exercice})")
            ->greeting("Bonjour,")
            ->line("Dans le cadre de la campagne d'évaluation {$this->campagne->exercice}, la fiche de **{$nom}** n'a pas encore été reçue par le DAF.")
            ->line("Merci de vous assurer que la fiche a bien été signée et transmise dans les meilleurs délais.")
            ->line("Campagne : {$this->campagne->exercice}" . ($this->campagne->titre ? " — {$this->campagne->titre}" : ''));
    }
}
