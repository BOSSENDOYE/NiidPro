<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\User;
use App\Notifications\ContractExpiredNotification;
use App\Notifications\ContractExpiringNotification;
use App\Services\MailConfigService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendContractExpiryNotificationsCommand extends Command
{
    protected $signature   = 'contracts:notify-expiry';
    protected $description = 'Envoie les notifications de fin de contrat (alerte 20j avant + expiration jour J)';

    public function handle(): int
    {
        // Appliquer la config mail SMTP depuis la base de données
        MailConfigService::applyDbConfig();

        $today    = Carbon::today();
        $admins   = User::where('is_active', true)->get();

        if ($admins->isEmpty()) {
            $this->warn('Aucun utilisateur actif trouvé — notifications annulées.');
            return self::SUCCESS;
        }

        // ── 1. Contrats expirant dans exactement 20 jours ────────────────────
        $alertDate = $today->copy()->addDays(20);

        $expiringIn20 = Contract::where('is_active', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', $alertDate)
            ->with('employee.department')
            ->get();

        foreach ($expiringIn20 as $contract) {
            foreach ($admins as $admin) {
                if ($this->alreadySent($admin, ContractExpiringNotification::class, $contract->id, 22)) {
                    continue;
                }
                try {
                    $admin->notify(new ContractExpiringNotification($contract));
                } catch (\Throwable $e) {
                    $this->error("Erreur notif expiring #{$contract->id}: {$e->getMessage()}");
                }
            }
            $this->info("Alerte 20j envoyée : {$contract->employee->full_name} (fin {$contract->end_date->format('d/m/Y')})");
        }

        // ── 2. Contrats expirant aujourd'hui → désactiver + notifier ─────────
        $expiredToday = Contract::where('is_active', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', $today)
            ->with('employee.department')
            ->get();

        foreach ($expiredToday as $contract) {
            // Désactiver le contrat automatiquement
            $contract->update(['is_active' => false]);

            foreach ($admins as $admin) {
                if ($this->alreadySent($admin, ContractExpiredNotification::class, $contract->id, 3)) {
                    continue;
                }
                try {
                    $admin->notify(new ContractExpiredNotification($contract));
                } catch (\Throwable $e) {
                    $this->error("Erreur notif expired #{$contract->id}: {$e->getMessage()}");
                }
            }
            $this->info("Expiration signalée : {$contract->employee->full_name} (fin {$contract->end_date->format('d/m/Y')})");
        }

        $this->info('Traitement terminé — ' . ($expiringIn20->count() + $expiredToday->count()) . ' contrat(s) traité(s).');

        return self::SUCCESS;
    }

    private function alreadySent(User $admin, string $notificationClass, int $contractId, int $withinDays): bool
    {
        return $admin->notifications()
            ->where('type', $notificationClass)
            ->where('created_at', '>=', now()->subDays($withinDays))
            ->get()
            ->contains(fn($n) => ($n->data['contract_id'] ?? null) === $contractId);
    }
}
