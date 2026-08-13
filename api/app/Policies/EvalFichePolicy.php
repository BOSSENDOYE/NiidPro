<?php

namespace App\Policies;

use App\Models\EvalFiche;
use App\Models\Employee;
use App\Models\User;

/**
 * Politique d'accès aux fiches d'évaluation (§9 — Confidentialité).
 *
 * Rôles accordant un accès complet (via before()) :
 *   super_admin, admin_rh, directeur_general, secretaire_general, daf
 *
 * Accès restreint pour les autres :
 *   - Agent     → sa propre fiche uniquement (via employee_id)
 *   - Responsable → fiches dont il est l'évaluateur (evaluateur_id)
 */
class EvalFichePolicy
{
    /**
     * Court-circuit : les rôles de direction et RH ont accès complet à toutes les fiches.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin_rh', 'directeur_general', 'secretaire_general', 'daf'])) {
            return true;
        }

        return null;
    }

    /**
     * Consulter une fiche.
     *   - Agent : accès à sa propre fiche uniquement.
     *   - Responsable (évaluateur) : accès aux fiches qu'il a évaluées.
     */
    public function view(User $user, EvalFiche $fiche): bool
    {
        if ($this->estAgentDeLaFiche($user, $fiche)) {
            return true;
        }

        return $user->id === $fiche->evaluateur_id;
    }

    /**
     * Modifier une fiche (notation, signatures…).
     * L'agent ne peut pas modifier sa propre fiche — lecture seule.
     */
    public function update(User $user, EvalFiche $fiche): bool
    {
        return $user->id === $fiche->evaluateur_id;
    }

    /**
     * Télécharger le PDF de la fiche — mêmes droits que view().
     */
    public function download(User $user, EvalFiche $fiche): bool
    {
        return $this->view($user, $fiche);
    }

    /**
     * Accuser réception d'un courrier — réservé à l'agent concerné.
     */
    public function accuserCourrier(User $user, EvalFiche $fiche): bool
    {
        return $this->estAgentDeLaFiche($user, $fiche);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Vérifie si l'utilisateur est l'agent évalué par la fiche. */
    private function estAgentDeLaFiche(User $user, EvalFiche $fiche): bool
    {
        // Chemin 1 : User.employee_id → Employee.id
        if ($user->employee_id && $user->employee_id === $fiche->employee_id) {
            return true;
        }

        // Chemin 2 : Employee.user_id → User.id (pivot inverse)
        if ($fiche->employee_id) {
            return Employee::where('id', $fiche->employee_id)
                ->where('user_id', $user->id)
                ->exists();
        }

        return false;
    }
}
