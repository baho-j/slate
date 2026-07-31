<?php

return [
    'disk' => 'cv',

    'max_bytes' => 5 * 1024 * 1024,

    'mime_types' => [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],

    'extensions' => ['pdf', 'doc', 'docx'],

    'url_ttl_minutes' => 10,
];
