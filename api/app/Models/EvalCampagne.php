<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvalCampagne extends Model
{
    protected $table = 'eval_campagnes';

    protected $fillable = [
        'exercice', 'titre', 'statut',
        'date_lancement', 'date_limite_planification', 'date_limite_entretiens',
        'date_limite_transmission', 'date_limite_synthese', 'date_cloture',
        'periode_debut', 'periode_fin', 'note_service',
        'cree_par', 'lance_par', 'lance_at',
    ];

    protected $casts = [
        'date_lancement'             => 'date',
        'date_limite_planification'  => 'date',
        'date_limite_entretiens'     => 'date',
        'date_limite_transmission'   => 'date',
        'date_limite_synthese'       => 'date',
        'date_cloture'               => 'date',
        'periode_debut'              => 'date',
        'periode_fin'                => 'date',
        'lance_at'                   => 'datetime',
    ];

    public function fiches(): HasMany
    {
        return $this->hasMany(EvalFiche::class, 'campagne_id');
    }

    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par');
    }

    public function lanceur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lance_par');
    }

    /** Statistiques d'avancement de la campagne. */
    public function stats(): array
    {
        $fiches = $this->fiches();
        return [
            'total'             => $fiches->count(),
            'a_planifier'       => $fiches->where('statut', 'a_planifier')->count(),
            'planifiees'        => $fiches->where('statut', 'planifiee')->count(),
            'en_cours'          => $fiches->where('statut', 'en_cours')->count(),
            'signees'           => $fiches->whereIn('statut', ['signee_evaluateur', 'signee_agent'])->count(),
            'transmises'        => $fiches->where('statut', 'transmise_daf')->count(),
            'notifiees'         => $fiches->where('statut', 'notifiee')->count(),
            'archivees'         => $fiches->where('statut', 'archivee')->count(),
        ];
    }
}
