<?php

namespace Database\Seeders;

use App\Models\Criterion;
use Illuminate\Database\Seeder;

class CriterionSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['key' => 'accuracy', 'name' => 'Accuracy', 'description' => 'Factual correctness of content.', 'weight' => 1.5, 'sort_order' => 1],
            ['key' => 'relevance', 'name' => 'Relevance', 'description' => 'Alignment with curriculum and learner needs.', 'weight' => 1.25, 'sort_order' => 2],
            ['key' => 'readability', 'name' => 'Readability', 'description' => 'Clarity, language level, and structure.', 'weight' => 1.0, 'sort_order' => 3],
            ['key' => 'engagement', 'name' => 'Engagement', 'description' => 'Examples, exercises, visuals, motivation.', 'weight' => 1.0, 'sort_order' => 4],
            ['key' => 'depth', 'name' => 'Depth of Coverage', 'description' => 'Breadth and depth of topic treatment.', 'weight' => 1.0, 'sort_order' => 5],
            ['key' => 'pedagogy', 'name' => 'Pedagogical Design', 'description' => 'Instructional design, scaffolding, assessments.', 'weight' => 1.0, 'sort_order' => 6],
        ];

        foreach ($defaults as $row) {
            Criterion::updateOrCreate(
                ['key' => $row['key']],
                array_merge($row, ['scale_min' => 1, 'scale_max' => 5, 'is_active' => true])
            );
        }
    }
}
