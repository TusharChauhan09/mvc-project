<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => env('SEED_ADMIN_EMAIL', 'admin@example.com')],
            [
                'name' => env('SEED_ADMIN_NAME', 'Admin'),
                'password' => env('SEED_ADMIN_PASSWORD', 'password'),
                'role' => Role::Admin->value,
            ]
        );

        $this->call([
            CriterionSeeder::class,
            BookSeeder::class,
        ]);
    }
}