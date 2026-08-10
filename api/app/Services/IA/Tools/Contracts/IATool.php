<?php

namespace App\Services\IA\Tools\Contracts;

use App\Models\User;

interface IATool
{
    /** Identifiant de l'outil tel qu'envoyé à Claude (snake_case). */
    public function name(): string;

    /** Description en français que Claude lit pour décider d'appeler cet outil. */
    public function description(): string;

    /** JSON Schema des paramètres d'entrée (format attendu par l'API Anthropic). */
    public function inputSchema(): array;

    /**
     * Exécute l'outil et retourne un tableau de résultats.
     * Doit lever une exception ou retourner ['error' => '...'] si l'accès est refusé.
     */
    public function execute(array $input, User $user): array;
}
