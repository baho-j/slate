<?php

namespace App\Providers;

use App\Mail\Transport\AzureCommunicationTransport;
use App\Policies\InterviewEvaluationPolicy;
use App\Policies\PipelinePolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(5)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        Gate::define('configurePipeline', [PipelinePolicy::class, 'configure']);
        Gate::define('submitEvaluation', [InterviewEvaluationPolicy::class, 'create']);
        Gate::define('viewEvaluation', [InterviewEvaluationPolicy::class, 'view']);

        Mail::extend('acs', fn (array $config) => new AzureCommunicationTransport(
            $config['endpoint'] ?? '',
            $config['key'] ?? '',
        ));
    }
}
