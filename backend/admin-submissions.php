<?php

declare(strict_types=1);

$config = [
    'admin_token' => getenv('AMW_ADMIN_TOKEN') ?: '',
    'queue_path' => getenv('AMW_QUEUE_PATH') ?: __DIR__ . '/private/evidence-submissions.jsonl',
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
    echo json_encode(['ok' => true, 'submissions' => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$lines = file($queuePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
$submissions = [];
foreach ($lines as $line) {
    $decoded = json_decode($line, true);
    if (is_array($decoded)) {
        $submissions[] = $decoded;
    }
}

echo json_encode([
    'ok' => true,
    'count' => count($submissions),
    'submissions' => array_reverse($submissions),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

function bearer_token(): string
{
    $header = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return '';
}
