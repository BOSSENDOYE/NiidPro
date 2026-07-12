<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Notifications de fin de contrat : tous les jours à 08h00
Schedule::command('contracts:notify-expiry')->dailyAt('08:00');
