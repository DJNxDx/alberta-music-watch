<?php

declare(strict_types=1);

$config = [
    'admin_token' => getenv('AMW_ADMIN_TOKEN') ?: '',
    'github_repo' => getenv('AMW_GITHUB_REPO') ?: 'DJNxDx/alberta-music-watch',
    'github_token' => getenv('AMW_GITHUB_TOKEN') ?: '',
    'queue_path' => getenv('AMW_QUEUE_PATH') ?: __DIR__ . '/private/evidence-submissions.jsonl',
    'review_path' => getenv('AMW_REVIEW_PATH') ?: __DIR__ . '/private/evidence-reviews.jsonl',
];

$localConfig = __DIR__ . '/config.local.php';
if (is_readable($localConfig)) {
    $config = merge_config($config, require $localConfig);
}

header('Content-Type: application/json; charset=utf-8');

$expected = trim((string)$config['admin_token']);
$provided = bearer_token();
if ($expected === '' || !hash_equals($expected, $provided)) {
    json_response(['ok' => false, 'error' => 'Unauthorized.'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'POST required.'], 405);
}

$payload = request_payload();
$submissionId = clean_field((string)($payload['submissionId'] ?? ''), 120);
$decision = normalize_decision((string)($payload['decision'] ?? ''));
$reason = clean_field((string)($payload['reason'] ?? ''), 4000, true);
$reviewer = clean_field((string)($payload['reviewer'] ?? ''), 120) ?: 'nightly-audit';
$publish = array_key_exists('publish', $payload)
    ? filter_var($payload['publish'], FILTER_VALIDATE_BOOLEAN)
    : $decision === 'relevant';

if ($submissionId === '' || $decision === '' || $reason === '') {
    json_response(['ok' => false, 'error' => 'submissionId, decision, and reason are required.'], 422);
}

$submissions = read_jsonl((string)$config['queue_path']);
$submission = find_submission($submissions, $submissionId);
if ($submission === null) {
    json_response(['ok' => false, 'error' => 'Submission not found.'], 404);
}

$reviews = read_jsonl((string)$config['review_path']);
$existingIssueUrl = existing_issue_url($reviews, $submissionId);
$issueUrl = $existingIssueUrl;
$publishStatus = 'not_requested';
$publishError = null;

if ($decision === 'relevant' && $publish) {
    if ($existingIssueUrl !== null) {
        $publishStatus = 'already_published';
    } else {
        $published = create_github_issue($submission, $reason, $reviewer, $config);
        $issueUrl = $published['issueUrl'];
        $publishStatus = $published['status'];
        $publishError = $published['error'];
    }
}

$review = [
    'id' => gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)),
    'submissionId' => $submissionId,
    'reviewedAt' => gmdate('c'),
    'decision' => $decision,
    'reason' => $reason,
    'reviewer' => $reviewer,
    'published' => $issueUrl !== null,
    'publishStatus' => $publishStatus,
    'issueUrl' => $issueUrl,
    'publishError' => $publishError,
    'request' => [
        'ipHash' => hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '') . '|' . gmdate('Y-m-d')),
        'userAgent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 220),
    ],
];

append_jsonl((string)$config['review_path'], $review);

json_response([
    'ok' => true,
    'submissionId' => $submissionId,
    'decision' => $decision,
    'published' => $review['published'],
    'publishStatus' => $publishStatus,
    'issueUrl' => $issueUrl,
    'reviewId' => $review['id'],
]);

function merge_config(array $base, array $override): array
{
    foreach ($override as $key => $value) {
        if (in_array($key, ['github_token'], true) && trim((string)$value) === '') {
            continue;
        }
        $base[$key] = $value;
    }
    return $base;
}

function request_payload(): array
{
    if (count($_POST) > 0) {
        return $_POST;
    }

    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function clean_field(string $value, int $max, bool $allowNewlines = false): string
{
    $value = trim($value);
    $pattern = $allowNewlines ? '/[\x00-\x09\x0B-\x1F\x7F]+/' : '/[[:cntrl:]]+/';
    $value = preg_replace($pattern, ' ', $value) ?? '';
    return trim(substr($value, 0, $max));
}

function normalize_decision(string $decision): string
{
    $normalized = strtolower(trim(str_replace(['-', ' '], '_', $decision)));
    return in_array($normalized, ['relevant', 'not_relevant', 'needs_context'], true) ? $normalized : '';
}

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

function find_submission(array $submissions, string $submissionId): ?array
{
    foreach ($submissions as $submission) {
        if (($submission['id'] ?? '') === $submissionId) {
            return $submission;
        }
    }
    return null;
}

function existing_issue_url(array $reviews, string $submissionId): ?string
{
    for ($index = count($reviews) - 1; $index >= 0; $index--) {
        $review = $reviews[$index];
        if (($review['submissionId'] ?? '') !== $submissionId) {
            continue;
        }
        $issueUrl = trim((string)($review['issueUrl'] ?? ''));
        if ($issueUrl !== '') {
            return $issueUrl;
        }
    }
    return null;
}

function append_jsonl(string $path, array $record): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        json_response(['ok' => false, 'error' => 'Unable to create review queue.'], 500);
    }

    $line = json_encode($record, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    if (file_put_contents($path, $line, FILE_APPEND | LOCK_EX) === false) {
        json_response(['ok' => false, 'error' => 'Unable to write review queue.'], 500);
    }
}

function create_github_issue(array $submission, string $reviewReason, string $reviewer, array $config): array
{
    $token = trim((string)$config['github_token']);
    if ($token === '' || !function_exists('curl_init')) {
        return ['status' => 'not_configured', 'issueUrl' => null, 'error' => 'GitHub publishing is not configured.'];
    }

    $repo = (string)$config['github_repo'];
    $url = 'https://api.github.com/repos/' . $repo . '/issues';
    $payload = json_encode([
        'title' => substr('[Evidence] ' . (string)$submission['sourceOrOrganization'], 0, 220),
        'body' => github_issue_body($submission, $reviewReason, $reviewer),
    ], JSON_UNESCAPED_SLASHES);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'User-Agent: Alberta-Music-Watch-Evidence-Review',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_TIMEOUT => 12,
    ]);

    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        return [
            'status' => 'failed',
            'issueUrl' => null,
            'error' => $curlError !== '' ? $curlError : ('GitHub returned HTTP ' . $status),
        ];
    }

    $decoded = json_decode((string)$response, true);
    $issueUrl = is_array($decoded) ? ($decoded['html_url'] ?? null) : null;
    return [
        'status' => $issueUrl === null ? 'failed' : 'published',
        'issueUrl' => $issueUrl,
        'error' => $issueUrl === null ? 'GitHub response did not include an issue URL.' : null,
    ];
}

function github_issue_body(array $submission, string $reviewReason, string $reviewer): string
{
    $links = count($submission['links'] ?? []) === 0
        ? '- No source links'
        : implode("\n", array_map(fn ($link) => '- ' . $link, $submission['links']));
    $files = count($submission['files'] ?? []) === 0
        ? '- No uploaded documents'
        : implode("\n", array_map(
            fn ($file) => '- ' . $file['originalName'] . ' (' . $file['size'] . ' bytes, sha256 ' . $file['sha256'] . ')',
            $submission['files']
        ));

    return implode("\n", [
        '## Reviewed evidence submission',
        '',
        '**Submission ID:** ' . $submission['id'],
        '**Received:** ' . $submission['receivedAt'],
        '**Review decision:** relevant',
        '**Review reason:** ' . $reviewReason,
        '**Reviewer:** ' . $reviewer,
        '',
        '## Submitted source',
        '**Source or organization:** ' . $submission['sourceOrOrganization'],
        '**Relevance selected by submitter:** ' . $submission['relevance'],
        '**Suggested weight:** ' . $submission['suggestedWeight'],
        '**Submitter context:** ' . $submission['submitterContext'],
        '**Public/shareable material:** ' . $submission['publicShareableMaterial'],
        '',
        '## Source links',
        $links,
        '',
        '## Uploaded documents',
        $files,
        '',
        '## What the audit should understand',
        $submission['claim'],
        '',
        '## Daily audit handling',
        '- Verify source authenticity and publication date before changing the public site.',
        '- Add source-backed findings to data.js, bundled source pages, entity profiles, funding questions, or the daily brief as appropriate.',
        '- Keep claims separate from verified evidence.',
    ]);
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function bearer_token(): string
{
    $header = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return '';
}
