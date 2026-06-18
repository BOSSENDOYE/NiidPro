<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MailSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class MailSettingController extends Controller
{
    public function index()
    {
        return response()->json($this->format(MailSetting::current()));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'mailer'       => ['required', 'string', 'max:50'],
            'host'         => ['nullable', 'string', 'max:255'],
            'port'         => ['nullable', 'integer'],
            'username'     => ['nullable', 'string', 'max:255'],
            'password'     => ['nullable', 'string', 'max:255'],
            'encryption'   => ['nullable', 'string', 'in:tls,ssl,none'],
            'from_address' => ['nullable', 'email', 'max:255'],
            'from_name'    => ['nullable', 'string', 'max:255'],
        ]);

        $settings = MailSetting::current();
        // Ne pas écraser le mot de passe si le champ est laissé vide
        if (empty($data['password'])) {
            unset($data['password']);
        }
        if (($data['encryption'] ?? null) === 'none') {
            $data['encryption'] = null;
        }
        $settings->update($data);

        return response()->json($this->format($settings->fresh()));
    }

    /** Applique la config en mémoire et envoie un email de test. */
    public function test(Request $request)
    {
        $data = $request->validate([
            'to' => ['required', 'email'],
        ]);

        $s = MailSetting::current();
        $this->applyConfig($s);

        try {
            Mail::raw('Ceci est un email de test envoyé depuis la plateforme RH+PAIE.', function ($msg) use ($data, $s) {
                $msg->to($data['to'])
                    ->subject('Test de configuration email')
                    ->from($s->from_address ?: config('mail.from.address'), $s->from_name ?: config('mail.from.name'));
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Échec : ' . $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Email de test envoyé à ' . $data['to']]);
    }

    private function applyConfig(MailSetting $s): void
    {
        Config::set('mail.default', $s->mailer ?: 'smtp');
        Config::set('mail.mailers.smtp.host', $s->host);
        Config::set('mail.mailers.smtp.port', $s->port);
        Config::set('mail.mailers.smtp.username', $s->username);
        Config::set('mail.mailers.smtp.password', $s->password);
        Config::set('mail.mailers.smtp.encryption', $s->encryption);
        if ($s->from_address) {
            Config::set('mail.from.address', $s->from_address);
            Config::set('mail.from.name', $s->from_name ?: $s->from_address);
        }
    }

    private function format(MailSetting $s): array
    {
        return [
            'mailer'        => $s->mailer,
            'host'          => $s->host,
            'port'          => $s->port,
            'username'      => $s->username,
            'has_password'  => !empty($s->password),
            'encryption'    => $s->encryption ?: 'none',
            'from_address'  => $s->from_address,
            'from_name'     => $s->from_name,
        ];
    }
}
