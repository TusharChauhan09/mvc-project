<?php

namespace App\Enums;

enum BookSource: string
{
    case Manual = 'manual';
    case GoogleBooks = 'google_books';
    case OpenLibrary = 'open_library';
}
