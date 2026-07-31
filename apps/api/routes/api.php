<?php

use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CvUploadController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\PublicApplicationController;
use App\Http\Controllers\PublicCareersController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:auth');

Route::middleware('throttle:public')->prefix('public')->group(function () {
    Route::get('/o/{organization}', [PublicCareersController::class, 'organization']);
    Route::get('/o/{organization}/jobs', [PublicCareersController::class, 'jobs']);
    Route::get('/o/{organization}/jobs/{job}', [PublicCareersController::class, 'job']);
    Route::post('/o/{organization}/jobs/{job}/apply', [PublicApplicationController::class, 'store']);

    Route::post('/uploads/cv', [CvUploadController::class, 'store']);
    Route::put('/uploads/cv/{key}', [CvUploadController::class, 'put'])
        ->where('key', 'cv/.*')
        ->name('public.uploads.cv.put');
    Route::get('/uploads/cv/{key}', [CvUploadController::class, 'download'])
        ->where('key', 'cv/.*')
        ->name('applications.cv.download');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::post('/jobs/{job}/publish', [JobController::class, 'publish']);
    Route::post('/jobs/{job}/close', [JobController::class, 'close']);
    Route::apiResource('jobs', JobController::class);

    Route::get('/jobs/{job}/applications', [ApplicationController::class, 'index']);
    Route::get('/applications/{application}', [ApplicationController::class, 'show']);
    Route::patch('/applications/{application}/stage', [ApplicationController::class, 'moveStage']);
    Route::get('/applications/{application}/documents/{document}/url', [ApplicationController::class, 'documentUrl']);
});
