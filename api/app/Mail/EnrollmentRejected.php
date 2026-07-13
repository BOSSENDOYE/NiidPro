<?php

namespace App\Mail;

use App\Models\EnrollmentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnrollmentRejected extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public EnrollmentRequest $enrollment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Demande d\'enrôlement — Modifications requises');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.enrollment.rejected');
    }
}
