<?php

namespace App\Enums;

enum BookType: string
{
    case Textbook = 'textbook';
    case Reference = 'reference';
    case Ebook = 'ebook';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
