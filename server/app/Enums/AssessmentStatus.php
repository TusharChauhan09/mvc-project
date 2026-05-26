<?php

namespace App\Enums;

enum AssessmentStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Archived = 'archived';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
