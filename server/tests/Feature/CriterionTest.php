<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CriterionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_criterion(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)
            ->postJson('/api/v1/criteria', [
                'key' => 'clarity',
                'name' => 'Clarity',
                'scale_min' => 1,
                'scale_max' => 5,
                'weight' => 1.5,
            ])
            ->assertCreated();
    }

    public function test_non_admin_cannot_create_criterion(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/criteria', [
                'key' => 'clarity',
                'name' => 'Clarity',
                'scale_min' => 1,
                'scale_max' => 5,
                'weight' => 1.0,
            ])
            ->assertForbidden();
    }
}
