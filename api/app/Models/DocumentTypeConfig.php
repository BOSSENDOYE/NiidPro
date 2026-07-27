<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentTypeConfig extends Model
{
    protected $fillable = ['key', 'label', 'cat', 'color', 'bg', 'border', 'prefix'];
}
