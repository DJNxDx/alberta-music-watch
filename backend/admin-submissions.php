<?php

declare(strict_types=1);

$config = [
    'admin_token' => getenv('AMW_ADMIN_TOKEN') ?: '',
    'queue_path' => getenv('AMW_QUEUE_PATH') ?: __DIR__ . '/private/evidence-submissions.jsonl',
    'review_path' => getenv('AMW_REVIEW_PATH') ?: __DIR__ . '/private/evidence-reviews.jsonl',
];

$localConfig = __DIR__ . '/config.local.php';
if (is_readable($localConfig)) {
    $config = array_replace($config, require $localConfig);
}

header('Content-Type: application/json; charset=utf-8');

$expected = trim((string)$config['admin_token']);
$provided = bearer_token();
if ($expected === '' || !hash_equals($expected, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized.']);
    exit;
}

$queuePath = (string)$config['queue_path'];
if (!is_readable($queuePath)) {
    echo json_encode([
        'ok' => true,
        'count' => 0,
        'pendingCount' => 0,
        'reviewCounts' => [],
        'submissions' => [],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$submissions = read_jsonl($queuePath);
$reviews = read_jsonl((string)$config['review_path']);
$latestReviews = latest_reviews_by_submission($reviews);
$reviewCounts = [];

foreach ($submissions as &$submission) {
    $id = (string)($submission['id'] ?? '');
    $review = $latestReviews[$id] ?? null;
    $status = is_array($review) ? (string)($review['decision'] ?? 'reviewed') : 'pending';
    $submission['review'] = $review;
    $submission['reviewStatus'] = $status;
    $reviewCounts[$status] = ($reviewCounts[$status] ?? 0) + 1;
}
unset($submission);

if (!isset($reviewCounts['pending'])) {
    $reviewCounts['pending'] = 0;
}
ksort($reviewCounts);

echo json_encode([
    'ok' => true,
    'count' => count($submissions),
    'pendingCount' => $reviewCounts['pending'],
    'reviewCounts' => $reviewCounts,
    'submissions' => array_reverse($submissions),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

function read_jsonl(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $records = [];
    foreach ($lines as $line) {
        $decoded = json_decode($line, true);
        if (is_array($decoded)) {
            $records[] = $decoded;
        }
    }
    return $records;
}

function latest_reviews_by_submission(array $reviews): array
{
    $latest = [];
    foreach ($reviews as $review) {
        $submissionId = (string)($review['submissionId'] ?? '');
        if ($submissionId === '') {
            continue;
        }
        $latest[$submissionId] = $review;
    }
    return $latest;
}

function bearer_token(): string
{
    $header = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return '';
}
