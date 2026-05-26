<?php

namespace App\Services\Books;

interface BookProvider
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, int $limit = 20): array;

    public function findByExternalId(string $id): ?array;
}
