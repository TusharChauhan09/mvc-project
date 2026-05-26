<?php

namespace App\Enums;

enum Role: string
{
    case Admin = 'admin';
    case Educator = 'educator';
    case Reviewer = 'reviewer';
    case Seller = 'seller';
    case Student = 'student';

    public function canManageBooks(): bool
    {
        return in_array($this, [self::Admin, self::Educator], true);
    }

    public function canAssess(): bool
    {
        return in_array($this, [self::Admin, self::Educator, self::Reviewer], true);
    }

    public function canManageCriteria(): bool
    {
        return $this === self::Admin;
    }

    public function canSell(): bool
    {
        return in_array($this, [self::Admin, self::Seller], true);
    }

    public function isAdmin(): bool
    {
        return $this === self::Admin;
    }

    public static function requestableRoles(): array
    {
        return [self::Seller->value, self::Reviewer->value, self::Educator->value];
    }
}
