<?php

namespace App\Policies;

use App\Enums\AssessmentStatus;
use App\Models\Assessment;
use App\Models\User;

class AssessmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Assessment $assessment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        if ($assessment->status === AssessmentStatus::Submitted) {
            return true;
        }
        return $assessment->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->role->canAssess();
    }

    public function update(User $user, Assessment $assessment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return $assessment->user_id === $user->id
            && $assessment->status === AssessmentStatus::Draft;
    }

    public function delete(User $user, Assessment $assessment): bool
    {
        return $user->isAdmin() || $assessment->user_id === $user->id;
    }

    public function submit(User $user, Assessment $assessment): bool
    {
        return $assessment->user_id === $user->id
            && $assessment->status === AssessmentStatus::Draft;
    }
}
