<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SentEmail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class EmailController extends Controller
{
    /**
     * Liste des emails envoyés (historique), filtrable par agent.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SentEmail::with(['employee', 'sender'])->latest();

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->get('employee_id'));
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    /**
     * Envoie un email depuis la plateforme (sans client mail externe).
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to_email'    => ['required', 'email'],
            'to_name'     => ['nullable', 'string', 'max:255'],
            'subject'     => ['required', 'string', 'max:255'],
            'body'        => ['required', 'string'],
            'employee_id' => ['nullable', 'exists:employees,id'],
        ]);

        $status = 'sent';
        $error  = null;

        try {
            $html = nl2br(e($data['body']));
            Mail::html($html, function ($message) use ($data) {
                $message->to($data['to_email'], $data['to_name'] ?? null)
                        ->subject($data['subject']);
            });
        } catch (\Throwable $e) {
            $status = 'failed';
            $error  = $e->getMessage();
        }

        $email = SentEmail::create([
            'to_email'    => $data['to_email'],
            'to_name'     => $data['to_name'] ?? null,
            'subject'     => $data['subject'],
            'body'        => $data['body'],
            'employee_id' => $data['employee_id'] ?? null,
            'sent_by'     => auth()->id(),
            'status'      => $status,
            'error'       => $error,
        ]);

        if ($status === 'failed') {
            return response()->json([
                'message' => "L'envoi a échoué : {$error}",
                'email'   => $email,
            ], 502);
        }

        return response()->json([
            'message' => 'Email envoyé avec succès.',
            'email'   => $email->load('employee'),
        ], 201);
    }
}
