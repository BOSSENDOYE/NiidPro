<?php

namespace App\Services;

use App\Models\MailSetting;
use Illuminate\Support\Facades\Config;

class MailConfigService
{
    public static function applyDbConfig(): void
    {
        try {
            $s = MailSetting::current();
        } catch (\Throwable) {
            return;
        }

        if (!$s || !$s->host) return;

        Config::set('mail.default', $s->mailer ?: 'smtp');
        Config::set('mail.mailers.smtp.host', $s->host);
        Config::set('mail.mailers.smtp.port', $s->port);
        Config::set('mail.mailers.smtp.username', $s->username);
        Config::set('mail.mailers.smtp.password', $s->password);
        Config::set('mail.mailers.smtp.encryption', $s->encryption ?: null);

        if ($s->from_address) {
            Config::set('mail.from.address', $s->from_address);
            Config::set('mail.from.name', $s->from_name ?: $s->from_address);
        }
    }
}
