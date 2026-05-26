<?php

namespace App\Policies;

use App\Models\Criterion;
use App\Models\User;

class CriterionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Criterion $criterion): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->role->canManageCriteria();
    }

    public function update(User $user, Criterion $criterion): bool
    {
        return $user->role->canManageCriteria();
    }

    public function delete(User $user, Criterion $criterion): bool
    {
        return $user->role->canManageCriteria();
    }
}
