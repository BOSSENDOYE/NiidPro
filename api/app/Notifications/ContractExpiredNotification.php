<?php

namespace App\Notifications;

use App\Models\Contract;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContractExpiredNotification extends Notification
{
    public function __construct(public readonly Contract $contract) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $employee = $this->contract->employee;
        $endDate  = $this->contract->end_date->format('d/m/Y');

        return (new MailMessage)
            ->subject("🔴 Contrat expiré — {$employee->full_name}")
            ->greeting('Bonjour,')
            ->line("Le contrat de **{$employee->full_name}** ({$this->contract->type}) a expiré **aujourd'hui, le {$endDate}**.")
            ->line("Le contrat a été automatiquement désactivé dans le système.")
            ->line("Veuillez régulariser la situation de cet agent (renouvellement, CDI ou clôture).")
            ->action('Gérer les contrats', url('/contracts'))
            ->salutation('Cordialement, Système RH+PAIE ANASER');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'contract_expired',
            'contract_id'   => $this->contract->id,
            'employee_id'   => $this->contract->employee_id,
            'employee_name' => $this->contract->employee->full_name,
            'contract_type' => $this->contract->type,
            'end_date'      => $this->contract->end_date->toDateString(),
            'days_left'     => 0,
        ];
    }
}
