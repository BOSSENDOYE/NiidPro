<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganisationUnit extends Model
{
    protected $fillable = ['code', 'libelle', 'type', 'niveau', 'parent_id', 'ordre'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(OrganisationUnit::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(OrganisationUnit::class, 'parent_id')->orderBy('ordre');
    }

    /** Retourne l'arbre complet (récursif) depuis les racines. */
    public static function tree(): \Illuminate\Support\Collection
    {
        $all = self::orderBy('niveau')->orderBy('ordre')->get()->keyBy('id');

        foreach ($all as $unit) {
            $unit->setAttribute('_children', collect());
        }

        $roots = collect();
        foreach ($all as $unit) {
            if ($unit->parent_id && $all->has($unit->parent_id)) {
                $all[$unit->parent_id]->_children->push($unit);
            } else {
                $roots->push($unit);
            }
        }

        return $roots;
    }
}
