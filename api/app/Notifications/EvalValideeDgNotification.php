<?php

namespace App\Notifications;

use App\Models\EvalSynthese;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EvalValideeDgNotification extends Notification
{
    public function __construct(
        private EvalSynthese $synthese,
        private User         $dg,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'eval_valide_dg',
            'synthese_id' => $this->synthese->id,
            'campagne_id' => $this->synthese->campagne_id,
            'exercice'    => $this->synthese->campagne?->exercice,
            'version'     => $this->synthese->version,
            'valide_par'  => $this->dg->name ?? $this->dg->email,
            'message'     => "Le tableau de synthèse v{$this->synthese->version} a été validé par le Directeur général. Vous pouvez procéder à la notification des agents (SP6).",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $exercice = $this->synthese->campagne?->exercice ?? '';

        return (new MailMessage)
            ->subject("[NiidPro] Tableau de synthèse annoté — Exercice {$exercice} — Action requise")
            ->greeting('Bonjour,')
            ->line("Le Directeur général a validé et transmis le tableau de synthèse annoté des évaluations.")
            ->line("**Campagne :** Exercice {$exercice} — Version {$this->synthese->version}")
            ->line("**Validé par :** " . ($this->dg->name ?? $this->dg->email))
            ->line("Vous pouvez maintenant établir les courriers de notification individuelle des agents (Sous-procédure 6).")
            ->action('Accéder au module évaluations', url('/'));
    }
}
