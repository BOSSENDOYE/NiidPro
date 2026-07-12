<?php

namespace App\Notifications;

use App\Models\Contract;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContractExpiringNotification extends Notification
{
    public function __construct(public readonly Contract $contract) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $employee = $this->contract->employee;
        $daysLeft = (int) now()->diffInDays($this->contract->end_date);
        $endDate  = $this->contract->end_date->format('d/m/Y');

        return (new MailMessage)
            ->subject("⚠️ Contrat de {$employee->full_name} — expiration dans {$daysLeft} jours")
            ->greeting('Bonjour,')
            ->line("Le contrat de **{$employee->full_name}** ({$this->contract->type}) arrive à échéance dans **{$daysLeft} jours**.")
            ->line("**Date de fin :** {$endDate}")
            ->line("Veuillez prendre les mesures nécessaires : renouvellement, transformation ou clôture du contrat.")
            ->action('Consulter le contrat', url('/contracts'))
            ->salutation('Cordialement, Système RH+PAIE ANASER');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'contract_expiring',
            'contract_id'   => $this->contract->id,
            'employee_id'   => $this->contract->employee_id,
            'employee_name' => $this->contract->employee->full_name,
            'contract_type' => $this->contract->type,
            'end_date'      => $this->contract->end_date->toDateString(),
            'days_left'     => (int) now()->diffInDays($this->contract->end_date),
        ];
    }
}
