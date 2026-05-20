<?php

return [
    'allowed_origins' => [
        'https://watch.albertamusic.live',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ],
    'github_repo' => 'DJNxDx/alberta-music-watch',
    'github_token' => 'github_pat_or_fine_grained_token_with_issues_write',
    'admin_token' => 'replace_with_a_long_random_secret',
    'queue_path' => __DIR__ . '/private/evidence-submissions.jsonl',
    'upload_dir' => __DIR__ . '/private/uploads',
];
