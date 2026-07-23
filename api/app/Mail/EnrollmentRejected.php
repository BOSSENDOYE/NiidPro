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

class EnrollmentRejected extends Mailable
{
    use Queueable, SerializesModels;

    public string  $companyName;
    public ?string $logoUrl;

    public function __construct(public EnrollmentRequest $enrollment)
    {
        $settings          = CompanySetting::current();
        $this->companyName = $settings->name ?? 'ANASER';
        $this->logoUrl     = $settings->logo_path
            ? Storage::disk('public')->url($settings->logo_path)
            : null;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⚠️ Demande d\'enrôlement — Corrections requises',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.enrollment.rejected');
    }
}
