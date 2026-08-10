<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IAConversation;
use App\Services\IA\ClaudeAgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentIAController extends Controller
{
    public function __construct(private ClaudeAgentService $agentService) {}

    public function chat(Request $request): JsonResponse
    {
        $request->validate(['message' => 'required|string|max:1000']);

        $user    = $request->user();
        $message = $request->input('message');

        // Conversation persistante : une par utilisateur
        $conversation = IAConversation::firstOrCreate(['user_id' => $user->id]);

        // Historique : 10 derniers échanges (20 messages)
        $history = $conversation->messages()
            ->orderBy('created_at')
            ->latest()
            ->limit(20)
            ->get()
            ->reverse()
            ->values()
            ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        // Message courant ajouté à la fin
        $messages = array_merge($history, [['role' => 'user', 'content' => $message]]);

        try {
            $reply = $this->agentService->run($messages, $user);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }

        // Persister la question et la réponse
        $conversation->messages()->createMany([
            ['role' => 'user',      'content' => $message],
            ['role' => 'assistant', 'content' => $reply],
        ]);

        return response()->json(['reply' => $reply]);
    }
}
