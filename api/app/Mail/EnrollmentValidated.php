<?php

namespace App\Mail;

use App\Models\EnrollmentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnrollmentValidated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public EnrollmentRequest $enrollment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre enrôlement a été validé — Bienvenue !');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.enrollment.validated');
    }
}
