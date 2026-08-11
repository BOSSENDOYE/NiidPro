<?php

namespace App\Services\IA\Tools;

use App\Models\IAFile;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class LireFichierTool implements IATool
{
    public function name(): string { return 'lire_fichier_memoire'; }

    public function description(): string
    {
        return 'Lit le contenu d\'un fichier sauvegardé dans la bibliothèque/mémoire de l\'utilisateur (documents, procédures, textes). Sans argument, liste tous les fichiers mémorisés. Utilise cet outil quand l\'utilisateur mentionne un document ou fichier qu\'il a enregistré.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'nom_fichier' => [
                    'type'        => 'string',
                    'description' => 'Nom (ou partie du nom) du fichier à lire. Omis pour lister tous les fichiers mémorisés.',
                ],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $query = IAFile::where('user_id', $user->id)->where('is_persistent', true);

        // Liste tous les fichiers mémorisés
        if (empty($input['nom_fichier'])) {
            $files = $query->orderByDesc('created_at')->get()
                ->map(fn($f) => [
                    'nom'  => $f->filename,
                    'type' => $f->typeLabel(),
                    'ko'   => $f->size_kb,
                ]);
            return [
                'fichiers_en_memoire' => $files->toArray(),
                'total' => $files->count(),
            ];
        }

        // Cherche un fichier par nom
        $nom  = $input['nom_fichier'];
        $file = $query->where('filename', 'like', "%{$nom}%")->first();

        if (! $file) {
            return [
                'erreur' => "Fichier '{$nom}' introuvable en mémoire. Appelez lire_fichier_memoire sans argument pour voir la liste complète.",
            ];
        }

        if ($file->content) {
            return ['fichier' => $file->filename, 'contenu' => $file->content];
        }

        if (str_starts_with($file->media_type, 'image/')) {
            return [
                'fichier' => $file->filename,
                'info'    => 'Image mémorisée (sans contenu textuel). Demandez à l\'utilisateur de la joindre directement à un message pour pouvoir l\'analyser visuellement.',
            ];
        }

        if ($file->media_type === 'application/pdf') {
            return [
                'fichier' => $file->filename,
                'info'    => 'PDF mémorisé. Demandez à l\'utilisateur de le joindre à un message pour analyser son contenu.',
            ];
        }

        return [
            'fichier' => $file->filename,
            'info'    => 'Contenu non disponible. Demandez à l\'utilisateur de joindre ce fichier à un message.',
        ];
    }
}
