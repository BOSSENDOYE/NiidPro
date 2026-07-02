<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollTemplate extends Model
{
    protected $table = 'payroll_templates';

    protected $fillable = ['name', 'description', 'creation_date', 'is_active'];

    protected $casts = [
        'is_active'     => 'boolean',
        'creation_date' => 'date',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(PayrollTemplateLine::class, 'template_id')
                    ->orderBy('ordre');
    }
}
