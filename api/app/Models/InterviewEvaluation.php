<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewEvaluation extends Model
{
    protected $fillable = [
        'interview_id', 'evaluator_id', 'criterion_id', 'criterion_name', 'score', 'comment',
    ];

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function criterion(): BelongsTo
    {
        return $this->belongsTo(JobPostingCriterion::class, 'criterion_id');
    }
}
