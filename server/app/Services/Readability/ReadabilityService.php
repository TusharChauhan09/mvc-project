<?php

namespace App\Services\Readability;

class ReadabilityService
{
    /**
     * Compute readability metrics on plain text.
     *
     * Returns:
     *  - words, sentences, syllables (counts)
     *  - flesch_reading_ease       (higher = easier; 0-100 typical)
     *  - flesch_kincaid_grade      (US grade level)
     *  - gunning_fog               (years of formal education needed)
     *  - smog                      (years of education for full comprehension)
     *  - normalized_score          (0-100, easier-is-higher, mapped from FRE)
     *
     * @return array<string, float|int>
     */
    public function analyze(string $text): array
    {
        $text = $this->clean($text);
        $sentences = $this->countSentences($text);
        $words = $this->splitWords($text);
        $wordCount = count($words);
        $syllables = 0;
        $complex = 0;

        foreach ($words as $w) {
            $syl = $this->syllableCount($w);
            $syllables += $syl;
            if ($syl >= 3 && ! $this->isCommonSuffixed($w)) {
                $complex++;
            }
        }

        $sentences = max(1, $sentences);
        $wordCount = max(1, $wordCount);

        $asl = $wordCount / $sentences;
        $asw = $syllables / $wordCount;

        $fre = 206.835 - 1.015 * $asl - 84.6 * $asw;
        $fkGrade = 0.39 * $asl + 11.8 * $asw - 15.59;
        $gunningFog = 0.4 * ($asl + 100 * ($complex / $wordCount));
        $smog = 1.0430 * sqrt($complex * (30 / $sentences)) + 3.1291;

        return [
            'words' => $wordCount,
            'sentences' => $sentences,
            'syllables' => $syllables,
            'complex_words' => $complex,
            'flesch_reading_ease' => round($fre, 2),
            'flesch_kincaid_grade' => round($fkGrade, 2),
            'gunning_fog' => round($gunningFog, 2),
            'smog' => round($smog, 2),
            'normalized_score' => round(max(0, min(100, $fre)), 2),
        ];
    }

    private function clean(string $text): string
    {
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        return trim($text);
    }

    private function countSentences(string $text): int
    {
        $matches = preg_match_all('/[.!?]+(?=\s|$)/u', $text);
        return max(1, (int) $matches);
    }

    /**
     * @return array<int, string>
     */
    private function splitWords(string $text): array
    {
        preg_match_all('/[A-Za-z][A-Za-z\'\-]*/u', $text, $m);
        return $m[0] ?? [];
    }

    private function syllableCount(string $word): int
    {
        $word = strtolower($word);
        $word = preg_replace('/[^a-z]/', '', $word) ?? '';
        if ($word === '') {
            return 0;
        }
        if (strlen($word) <= 3) {
            return 1;
        }
        $word = preg_replace('/(?:[^laeiouy]es|ed|[^laeiouy]e)$/', '', $word) ?? $word;
        $word = preg_replace('/^y/', '', $word) ?? $word;
        $count = preg_match_all('/[aeiouy]+/', $word);
        return max(1, (int) $count);
    }

    private function isCommonSuffixed(string $word): bool
    {
        $w = strtolower($word);
        return (bool) preg_match('/(?:es|ed|ing)$/', $w);
    }
}
