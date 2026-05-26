<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_token(): void
    {
        $resp = $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane',
            'email' => 'jane@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $resp->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'email', 'role'], 'token']);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'role' => Role::Reviewer->value,
        ]);
    }

    public function test_login_returns_token_with_valid_credentials(): void
    {
        $user = User::factory()->create(['email' => 'a@b.c', 'password' => 'password']);

        $resp = $this->postJson('/api/v1/auth/login', [
            'email' => 'a@b.c',
            'password' => 'password',
        ]);

        $resp->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_login_fails_with_bad_password(): void
    {
        User::factory()->create(['email' => 'a@b.c', 'password' => 'password']);
        $this->postJson('/api/v1/auth/login', [
            'email' => 'a@b.c',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_me_requires_auth(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_me_returns_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }
}
