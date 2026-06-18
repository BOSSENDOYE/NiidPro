<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailSetting extends Model
{
    protected $fillable = [
        'mailer', 'host', 'port', 'username', 'password',
        'encryption', 'from_address', 'from_name',
    ];

    protected $hidden = ['password'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], ['mailer' => 'smtp', 'port' => 587, 'encryption' => 'tls']);
    }
}
