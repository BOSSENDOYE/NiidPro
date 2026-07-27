<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\LeavePostponement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LeavePostponementController extends Controller
{
    private const STEP_LABELS = [
        1 => 'Avis du Directeur',
        2 => 'Chef Division RH',
        3 => 'DAF',
        4 => 'SG',
        5 => 'DG',
    ];

    // ── GET /leave-postponements ───────────────────────────────────────────────
    public function index(Request $request)
    {
        $query = LeavePostponement::with([
                'employee.department',
                'leave',
                'submittedBy',
                'n1User', 'n2User', 'n3User', 'n4User', 'n5User',
            ])
            ->when($request->employee_id, fn($q, $v) => $q->where('employee_id', $v))
            ->when($request->status,      fn($q, $v) => $q->where('status', $v))
            ->when($request->year,        fn($q, $v) =>
                $q->whereYear('date_depart_effectif', $v)
            );

        return response()->json($query->latest()->paginate(25));
    }

    // ── POST /leave-postponements ──────────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'          => ['required', 'exists:employees,id'],
            'leave_id'             => ['nullable', 'exists:leaves,id'],
            'date_depart_initial'  => ['required', 'date'],
            'date_retour_initial'  => ['required', 'date', 'after_or_equal:date_depart_initial'],
            'date_depart_effectif' => ['required', 'date', 'after:date_depart_initial'],
            'date_retour_effectif' => ['required', 'date', 'after_or_equal:date_depart_effectif'],
            'motif'                => ['required', 'string', 'max:1000'],
        ]);

        $jours = (int) Carbon::parse($data['date_depart_initial'])
            ->diffInDays(Carbon::parse($data['date_depart_effectif']));

        $postponement = LeavePostponement::create([
            ...$data,
            'jours_report'  => $jours,
            'status'        => 'pending',
            'submitted_by'  => $request->user()->id,
            'submitted_at'  => now(),
        ]);

        return response()->json(
            $postponement->load(['employee.department', 'leave', 'submittedBy']),
            201
        );
    }

    // ── GET /leave-postponements/{postponement} ────────────────────────────────
    public function show(LeavePostponement $postponement)
    {
        return response()->json(
            $postponement->load([
                'employee.department', 'leave',
                'submittedBy', 'n1User', 'n2User', 'n3User', 'n4User', 'n5User',
            ])
        );
    }

    // ── POST /leave-postponements/{postponement}/approve ──────────────────────
    public function approve(Request $request, LeavePostponement $postponement)
    {
        $data = $request->validate([
            'step'    => ['required', 'integer', 'between:1,5'],
            'status'  => ['required', 'in:approved,rejected'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        $step = (int) $data['step'];

        if ($postponement->status !== 'pending') {
            return response()->json(['message' => 'Cette demande est déjà clôturée.'], 422);
        }

        // Vérifier que les étapes précédentes sont approuvées
        for ($i = 1; $i < $step; $i++) {
            if ($postponement->{"n{$i}_status"} !== 'approved') {
                return response()->json([
                    'message' => "L'étape {$i} (" . self::STEP_LABELS[$i] . ") doit être approuvée en premier.",
                ], 422);
            }
        }

        // Mettre à jour le niveau
        $postponement->{"n{$step}_status"}  = $data['status'];
        $postponement->{"n{$step}_user_id"} = $request->user()->id;
        $postponement->{"n{$step}_at"}      = now();
        $postponement->{"n{$step}_comment"} = $data['comment'] ?? null;

        // Mettre à jour le statut global
        if ($data['status'] === 'rejected') {
            $postponement->status = 'rejected';
        } elseif ($step === 5) {
            // Tous les niveaux approuvés
            $postponement->status = 'approved';

            // Mettre à jour les dates du congé d'origine si lié
            if ($postponement->leave_id) {
                $leave = Leave::find($postponement->leave_id);
                if ($leave) {
                    $diff = $leave->end_date->diffInDays($leave->start_date);
                    $leave->update([
                        'start_date' => $postponement->date_depart_effectif,
                        'end_date'   => $postponement->date_retour_effectif,
                    ]);
                }
            }
        }

        $postponement->save();

        return response()->json(
            $postponement->fresh()->load([
                'employee.department', 'leave',
                'submittedBy', 'n1User', 'n2User', 'n3User', 'n4User', 'n5User',
            ])
        );
    }

    // ── DELETE /leave-postponements/{postponement} ────────────────────────────
    public function destroy(LeavePostponement $postponement)
    {
        if ($postponement->status === 'approved') {
            return response()->json(['message' => 'Impossible de supprimer une demande approuvée.'], 422);
        }
        $postponement->delete();
        return response()->json(['message' => 'Demande supprimée.']);
    }
}
