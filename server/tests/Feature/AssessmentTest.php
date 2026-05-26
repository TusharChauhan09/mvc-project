<?php

namespace Tests\Feature;

use App\Enums\AssessmentStatus;
use App\Models\Book;
use App\Models\Criterion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssessmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_assessment_with_scores_computes_overall(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $c1 = Criterion::factory()->create(['weight' => 2.0]);
        $c2 = Criterion::factory()->create(['weight' => 1.0]);

        $resp = $this->actingAs($user)->postJson('/api/v1/assessments', [
            'book_id' => $book->id,
            'summary' => 'Good',
            'scores' => [
                ['criterion_id' => $c1->id, 'value' => 4],
                ['criterion_id' => $c2->id, 'value' => 1],
            ],
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.status', AssessmentStatus::Draft->value);
        $this->assertEqualsWithDelta(3.0, (float) $resp->json('data.overall_score'), 0.01);
    }

    public function test_submit_changes_status_and_sets_timestamp(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $c = Criterion::factory()->create();

        $assessment = $this->actingAs($user)->postJson('/api/v1/assessments', [
            'book_id' => $book->id,
            'scores' => [['criterion_id' => $c->id, 'value' => 5]],
        ])->json('data');

        $resp = $this->actingAs($user)
            ->postJson("/api/v1/assessments/{$assessment['id']}/submit");

        $resp->assertOk()
            ->assertJsonPath('data.status', AssessmentStatus::Submitted->value);
        $this->assertEqualsWithDelta(5.0, (float) $resp->json('data.overall_score'), 0.01);
        $this->assertNotNull($resp->json('data.submitted_at'));
    }

    public function test_cannot_submit_without_scores(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();

        $assessment = $this->actingAs($user)->postJson('/api/v1/assessments', [
            'book_id' => $book->id,
        ])->json('data');

        $this->actingAs($user)
            ->postJson("/api/v1/assessments/{$assessment['id']}/submit")
            ->assertStatus(422);
    }

    public function test_other_user_cannot_update_draft(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $book = Book::factory()->create();
        $c = Criterion::factory()->create();

        $assessment = $this->actingAs($owner)->postJson('/api/v1/assessments', [
            'book_id' => $book->id,
            'scores' => [['criterion_id' => $c->id, 'value' => 3]],
        ])->json('data');

        $this->actingAs($other)
            ->putJson("/api/v1/assessments/{$assessment['id']}", ['summary' => 'hack'])
            ->assertForbidden();
    }
}
