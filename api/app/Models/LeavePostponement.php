<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeavePostponement extends Model
{
    protected $fillable = [
        'employee_id', 'leave_id', 'submitted_by', 'submitted_at',
        'date_depart_initial', 'date_retour_initial',
        'date_depart_effectif', 'date_retour_effectif',
        'jours_report', 'motif', 'status',
        'n1_status', 'n1_user_id', 'n1_at', 'n1_comment',
        'n2_status', 'n2_user_id', 'n2_at', 'n2_comment',
        'n3_status', 'n3_user_id', 'n3_at', 'n3_comment',
        'n4_status', 'n4_user_id', 'n4_at', 'n4_comment',
        'n5_status', 'n5_user_id', 'n5_at', 'n5_comment',
    ];

    protected $casts = [
        'date_depart_initial'  => 'date',
        'date_retour_initial'  => 'date',
        'date_depart_effectif' => 'date',
        'date_retour_effectif' => 'date',
        'submitted_at'         => 'datetime',
        'n1_at' => 'datetime', 'n2_at' => 'datetime',
        'n3_at' => 'datetime', 'n4_at' => 'datetime',
        'n5_at' => 'datetime',
    ];

    // ── Relations ──────────────────────────────────────────────────────────────
    public function employee()  { return $this->belongsTo(Employee::class); }
    public function leave()     { return $this->belongsTo(Leave::class); }
    public function submittedBy(){ return $this->belongsTo(User::class, 'submitted_by'); }
    public function n1User()    { return $this->belongsTo(User::class, 'n1_user_id'); }
    public function n2User()    { return $this->belongsTo(User::class, 'n2_user_id'); }
    public function n3User()    { return $this->belongsTo(User::class, 'n3_user_id'); }
    public function n4User()    { return $this->belongsTo(User::class, 'n4_user_id'); }
    public function n5User()    { return $this->belongsTo(User::class, 'n5_user_id'); }

    // ── Étape courante (1-5, null si terminé) ─────────────────────────────────
    public function getCurrentStepAttribute(): ?int
    {
        if ($this->status !== 'pending') return null;
        foreach (range(1, 5) as $i) {
            if ($this->{"n{$i}_status"} === 'pending') return $i;
        }
        return null;
    }
}
