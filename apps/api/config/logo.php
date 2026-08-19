<?php

return [
    'disk' => 'logo',

    'max_bytes' => 2 * 1024 * 1024,

    'mime_types' => [
        'image/png',
        'image/jpeg',
        'image/svg+xml',
        'image/webp',
    ],

    'extensions' => ['png', 'jpg', 'jpeg', 'svg', 'webp'],

    'url_ttl_minutes' => 10,
];
