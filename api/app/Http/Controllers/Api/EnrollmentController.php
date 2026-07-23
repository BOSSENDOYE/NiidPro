<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EnrollmentRejected;
use App\Mail\EnrollmentValidated;
use App\Models\Employee;
use App\Models\EnrollmentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class EnrollmentController extends Controller
{
    /** POST /api/enroll/submit — public, no auth */
    public function submit(Request $request)
    {
        $data = $request->validate([
            'matricule'       => 'required|string|max:50',
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'date_naissance'  => 'required|date',
            'lieu_naissance'  => 'required|string|max:150',
            'date_embauche'   => 'required|date',
            'fonction'        => 'required|string|max:150',
            'telephone'       => 'required|string|max:30',
            'email'           => 'required|email|max:150',
            'categorie_emploi'=> 'nullable|string|max:50',
            'qualification'   => 'nullable|string|max:100',
            'photo'           => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
        ]);

        // Block duplicate pending requests for same email
        $existing = EnrollmentRequest::where('email', $data['email'])
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Une demande en attente existe déjà pour cet email. Veuillez patienter ou contacter les RH.',
            ], 422);
        }

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('enrollments/photos', 'public');
        }
        unset($data['photo']);

        $enrollment = EnrollmentRequest::create($data);

        return response()->json([
            'message' => 'Votre demande a été soumise avec succès. Vous recevrez un email de confirmation une fois validée.',
            'id'      => $enrollment->id,
        ], 201);
    }

    /** GET /api/enrollments — protected */
    public function index(Request $request)
    {
        $query = EnrollmentRequest::with('reviewer')
            ->orderByRaw("FIELD(status, 'pending', 'validated', 'rejected')")
            ->orderByDesc('created_at');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $enrollments = $query->paginate(20);

        return response()->json($enrollments);
    }

    /** GET /api/enrollments/{id} — protected */
    public function show(EnrollmentRequest $enrollment)
    {
        // Try to find a matching employee
        $matched = Employee::where('employee_number', $enrollment->matricule)->first()
            ?? Employee::where('first_name', $enrollment->first_name)
                ->where('last_name', $enrollment->last_name)
                ->first();

        return response()->json([
            'enrollment' => $enrollment->load('reviewer'),
            'matched_employee' => $matched,
        ]);
    }

    /** POST /api/enrollments/{id}/validate — protected */
    public function validate(Request $request, EnrollmentRequest $enrollment)
    {
        if ($enrollment->status !== 'pending') {
            return response()->json(['message' => 'Cette demande n\'est plus en attente.'], 422);
        }

        // Find or create employee
        $employee = Employee::where('employee_number', $enrollment->matricule)->first()
            ?? Employee::where('first_name', $enrollment->first_name)
                ->where('last_name', $enrollment->last_name)
                ->first();

        $fields = [
            'employee_number' => $enrollment->matricule,
            'first_name'      => $enrollment->first_name,
            'last_name'       => $enrollment->last_name,
            'birth_date'      => $enrollment->date_naissance,
            'birth_place'     => $enrollment->lieu_naissance,
            'hire_date'       => $enrollment->date_embauche,
            'fonction'        => $enrollment->fonction,
            'phone_personal'  => $enrollment->telephone,
            'personal_email'  => $enrollment->email,
            'categorie_emploi'=> $enrollment->categorie_emploi,
            'qualification'   => $enrollment->qualification,
            'status'          => 'active',
            'photo'           => $enrollment->photo_path,
        ];

        if ($employee) {
            // Update only null/empty fields
            foreach ($fields as $key => $val) {
                if ($val !== null && $val !== '' && empty($employee->$key)) {
                    $employee->$key = $val;
                }
            }
            $employee->save();
        } else {
            $employee = Employee::create(array_filter($fields, fn($v) => $v !== null && $v !== ''));
        }

        $enrollment->update([
            'status'              => 'validated',
            'matched_employee_id' => $employee->id,
            'reviewed_by'         => $request->user()->id,
            'reviewed_at'         => Carbon::now(),
        ]);

        // Send confirmation email
        try {
            Mail::to($enrollment->email)->send(new EnrollmentValidated($enrollment));
        } catch (\Throwable) {
            // Mail failure must not block the validation
        }

        return response()->json([
            'message'  => 'Demande validée. L\'agent a été notifié par email.',
            'employee' => $employee,
        ]);
    }

    /** POST /api/enrollments/{id}/reject — protected */
    public function reject(Request $request, EnrollmentRequest $enrollment)
    {
        if ($enrollment->status !== 'pending') {
            return response()->json(['message' => 'Cette demande n\'est plus en attente.'], 422);
        }

        $data = $request->validate([
            'reason' => 'required|string|min:10',
        ]);

        $enrollment->update([
            'status'           => 'rejected',
            'rejection_reason' => $data['reason'],
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => Carbon::now(),
        ]);

        // Send rejection email with reason
        try {
            Mail::to($enrollment->email)->send(new EnrollmentRejected($enrollment));
        } catch (\Throwable) {
            // Mail failure must not block the rejection
        }

        return response()->json([
            'message' => 'Demande rejetée. L\'agent a été notifié par email avec le motif.',
        ]);
    }
}
