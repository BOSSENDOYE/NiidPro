<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionMembre extends Model
{
    protected $table = 'commission_membres';

    protected $fillable = [
        'processus_id',
        'user_id',
        'role',
    ];

    protected function casts(): array
    {
        return [
            'role' => 'string',
        ];
    }

    // Relations
    public function processus()
    {
        return $this->belongsTo(ProcessusRecrutement::class, 'processus_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
