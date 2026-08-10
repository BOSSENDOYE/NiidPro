<?php

namespace App\Mail;

use App\Models\CompanySetting;
use App\Models\EnrollmentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class EnrollmentValidated extends Mailable
{
    use Queueable, SerializesModels;

    public string  $companyName;
    public ?string $logoUrl;
    public ?string $tempPassword;
    public string  $portalUrl;

    public function __construct(public EnrollmentRequest $enrollment, ?string $tempPassword = null)
    {
        $settings          = CompanySetting::current();
        $this->companyName = $settings->name ?? 'ANASER';
        $this->logoUrl     = $settings->logo_path
            ? Storage::disk('public')->url($settings->logo_path)
            : null;
        $this->tempPassword = $tempPassword;
        $this->portalUrl    = rtrim(config('app.url'), '/');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Votre enrôlement a été validé — Bienvenue, ' . $this->enrollment->first_name . ' !',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.enrollment.validated');
    }
}
