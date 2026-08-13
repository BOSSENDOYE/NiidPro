<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalModeleNotification extends Model
{
    protected $table = 'eval_modeles_notification';

    protected $fillable = ['nom', 'objet_lettre', 'corps_html', 'variables_dispo', 'actif', 'cree_par'];

    protected $casts = ['variables_dispo' => 'array', 'actif' => 'boolean'];

    /** Variables disponibles dans les modèles de lettre (§7.6). */
    public const VARIABLES = [
        '{NOM_COMPLET}'    => 'Nom et prénom de l\'agent',
        '{MATRICULE}'      => 'Matricule de l\'agent',
        '{DIRECTION}'      => 'Direction / Département',
        '{SERVICE}'        => 'Service de l\'agent',
        '{FONCTION}'       => 'Fonction / Poste occupé',
        '{EXERCICE}'       => 'Exercice évalué (ex : 2026)',
        '{TITRE_CAMPAGNE}' => 'Titre de la campagne',
        '{NOTE}'           => 'Note finale (ex : 4.20 / 5)',
        '{APPRECIATION}'   => 'Appréciation (ex : Excellent)',
        '{DECISION_DG}'    => 'Décision de gratification du Directeur général',
        '{COMMENTAIRE_DG}' => 'Commentaire du Directeur général',
        '{DATE_DU_JOUR}'   => 'Date d\'édition du courrier (jj/mm/aaaa)',
        '{NOM_DG}'         => 'Nom du Directeur général',
    ];

    public function creePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par');
    }

    /**
     * Interpole les variables {VARIABLE} du modèle pour un agent donné.
     * La décision de gratification et le nom du DG sont optionnels.
     */
    public function interpoler(EvalFiche $fiche, ?EvalGratification $gratification = null, string $nomDg = ''): string
    {
        $appreciation = match ($fiche->appreciation ?? '') {
            'excellent'         => 'Excellent',
            'tres_satisfaisant' => 'Très satisfaisant',
            'satisfaisant'      => 'Satisfaisant',
            'a_ameliorer'       => 'À améliorer',
            'insuffisant'       => 'Insuffisant',
            default             => ucfirst($fiche->appreciation ?? '—'),
        };

        $remplacements = [
            '{NOM_COMPLET}'    => $fiche->snapshot_nom_complet ?? '—',
            '{MATRICULE}'      => $fiche->snapshot_matricule ?? '—',
            '{DIRECTION}'      => $fiche->snapshot_direction ?? '—',
            '{SERVICE}'        => $fiche->snapshot_service ?? '—',
            '{FONCTION}'       => $fiche->snapshot_fonction ?? '—',
            '{EXERCICE}'       => (string) ($fiche->campagne?->exercice ?? '—'),
            '{TITRE_CAMPAGNE}' => $fiche->campagne?->titre ?? '—',
            '{NOTE}'           => $fiche->moyenne !== null ? number_format($fiche->moyenne, 2) . ' / 5' : '—',
            '{APPRECIATION}'   => $appreciation,
            '{DECISION_DG}'    => $gratification?->libelleDecision() ?? 'Aucune décision particulière',
            '{COMMENTAIRE_DG}' => $gratification?->commentaire ?? '—',
            '{DATE_DU_JOUR}'   => \Carbon\Carbon::now()->format('d/m/Y'),
            '{NOM_DG}'         => $nomDg,
        ];

        return str_replace(array_keys($remplacements), array_values($remplacements), $this->corps_html);
    }
}
