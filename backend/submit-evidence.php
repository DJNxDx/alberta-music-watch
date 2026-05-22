<?php

declare(strict_types=1);

$config = [
    'allowed_origins' => [
        'https://watch.albertamusic.live',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ],
    'github_repo' => getenv('AMW_GITHUB_REPO') ?: 'DJNxDx/alberta-music-watch',
    'github_token' => getenv('AMW_GITHUB_TOKEN') ?: '',
    'queue_path' => getenv('AMW_QUEUE_PATH') ?: __DIR__ . '/private/evidence-submissions.jsonl',
    'upload_dir' => getenv('AMW_UPLOAD_DIR') ?: __DIR__ . '/private/uploads',
    'max_files' => 5,
    'max_file_bytes' => 12 * 1024 * 1024,
    'allowed_extensions' => ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'],
];

$localConfig = __DIR__ . '/config.local.php';
if (is_readable($localConfig)) {
    $config = merge_config($config, require $localConfig);
}

apply_cors($config);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!origin_allowed($config)) {
    json_response(['ok' => false, 'error' => 'Origin not allowed.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'POST required.'], 405);
}

if (trim((string)($_POST['website'] ?? '')) !== '') {
    json_response(['ok' => true, 'submissionId' => 'accepted']);
}

$title = field('title', 180);
$linksRaw = field('links', 5000, true, true);
$claim = field('claim', 5000, true, true);
$relevance = field('relevance', 120);
$weight = field('weight', 120);
$submitter = field('submitter', 180, false) ?: 'Not provided';
$publicRecord = isset($_POST['publicRecord']) ? 'Yes' : 'No';

if ($title === '' || $claim === '' || $publicRecord !== 'Yes') {
    json_response(['ok' => false, 'error' => 'Missing required evidence fields.'], 422);
}

$links = parse_links($linksRaw);
if (count($links) === 0 && !has_file_upload('documents')) {
    json_response(['ok' => false, 'error' => 'At least one valid http(s) source link or source document is required.'], 422);
}

$submissionId = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4));
$files = save_uploads($submissionId, $config);

$submission = [
    'id' => $submissionId,
    'receivedAt' => gmdate('c'),
    'sourceOrOrganization' => $title,
    'links' => $links,
    'claim' => $claim,
    'relevance' => $relevance,
    'suggestedWeight' => $weight,
    'submitterContext' => $submitter,
    'publicShareableMaterial' => $publicRecord,
    'reviewStatus' => 'pending',
    'files' => $files,
    'request' => [
        'origin' => (string)($_SERVER['HTTP_ORIGIN'] ?? ''),
        'ipHash' => hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '') . '|' . gmdate('Y-m-d')),
        'userAgent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 220),
    ],
];

write_queue($submission, $config);

json_response([
    'ok' => true,
    'submissionId' => $submissionId,
    'queued' => true,
    'reviewStatus' => 'pending',
    'fileCount' => count($files),
]);

function apply_cors(array $config): void
{
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '' && in_array($origin, $config['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Content-Type: application/json; charset=utf-8');
}

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

function origin_allowed(array $config): bool
{
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    return $origin === '' || in_array($origin, $config['allowed_origins'], true);
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function field(string $name, int $max, bool $required = true, bool $allowNewlines = false): string
{
    $value = trim((string)($_POST[$name] ?? ''));
    $pattern = $allowNewlines ? '/[\x00-\x09\x0B-\x1F\x7F]+/' : '/[[:cntrl:]]+/';
    $value = preg_replace($pattern, ' ', $value) ?? '';
    $value = substr($value, 0, $max);
    return $required ? $value : trim($value);
}

function parse_links(string $raw): array
{
    $links = [];
    foreach (preg_split('/\R+/', $raw) ?: [] as $line) {
        $url = trim($line);
        if ($url === '') {
            continue;
        }
        if (filter_var($url, FILTER_VALIDATE_URL) && preg_match('/^https?:\/\//i', $url)) {
            $links[] = $url;
        }
    }
    return array_values(array_unique($links));
}

function has_file_upload(string $name): bool
{
    if (!isset($_FILES[$name])) {
        return false;
    }
    $errors = $_FILES[$name]['error'] ?? UPLOAD_ERR_NO_FILE;
    if (is_array($errors)) {
        foreach ($errors as $error) {
            if ($error !== UPLOAD_ERR_NO_FILE) {
                return true;
            }
        }
        return false;
    }
    return $errors !== UPLOAD_ERR_NO_FILE;
}

function save_uploads(string $submissionId, array $config): array
{
    if (!isset($_FILES['documents'])) {
        return [];
    }

    $uploads = normalize_files($_FILES['documents']);
    $stored = [];
    $targetDir = rtrim((string)$config['upload_dir'], '/') . '/' . $submissionId;

    foreach ($uploads as $index => $file) {
        if ($index >= (int)$config['max_files']) {
            break;
        }
        if ($file['error'] === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_response(['ok' => false, 'error' => 'A document upload failed.'], 422);
        }
        if ($file['size'] > (int)$config['max_file_bytes']) {
            json_response(['ok' => false, 'error' => 'A document exceeds the upload size limit.'], 422);
        }

        $extension = strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $config['allowed_extensions'], true)) {
            json_response(['ok' => false, 'error' => 'Unsupported document type.'], 422);
        }

        if (!is_dir($targetDir) && !mkdir($targetDir, 0750, true) && !is_dir($targetDir)) {
            json_response(['ok' => false, 'error' => 'Unable to create upload queue.'], 500);
        }

        $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '-', (string)$file['name']);
        $safeName = trim($safeName ?: ('document-' . ($index + 1) . '.' . $extension), '-');
        $targetPath = $targetDir . '/' . $safeName;
        if (file_exists($targetPath)) {
            $targetPath = $targetDir . '/' . ($index + 1) . '-' . $safeName;
        }

        if (!move_uploaded_file((string)$file['tmp_name'], $targetPath)) {
            json_response(['ok' => false, 'error' => 'Unable to store uploaded document.'], 500);
        }

        $stored[] = [
            'originalName' => (string)$file['name'],
            'storedName' => basename($targetPath),
            'size' => (int)$file['size'],
            'sha256' => hash_file('sha256', $targetPath),
        ];
    }

    return $stored;
}

function normalize_files(array $files): array
{
    if (!is_array($files['name'])) {
        return [$files];
    }

    $normalized = [];
    foreach ($files['name'] as $index => $name) {
        $normalized[] = [
            'name' => $name,
            'type' => $files['type'][$index] ?? '',
            'tmp_name' => $files['tmp_name'][$index] ?? '',
            'error' => $files['error'][$index] ?? UPLOAD_ERR_NO_FILE,
            'size' => $files['size'][$index] ?? 0,
        ];
    }
    return $normalized;
}

function write_queue(array $submission, array $config): void
{
    $queuePath = (string)$config['queue_path'];
    $queueDir = dirname($queuePath);
    if (!is_dir($queueDir) && !mkdir($queueDir, 0750, true) && !is_dir($queueDir)) {
        json_response(['ok' => false, 'error' => 'Unable to create evidence queue.'], 500);
    }

    $line = json_encode($submission, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    if (file_put_contents($queuePath, $line, FILE_APPEND | LOCK_EX) === false) {
        json_response(['ok' => false, 'error' => 'Unable to write evidence queue.'], 500);
    }
}
