#!/usr/bin/env bash
set -e

# Point the built-in nginx at Laravel's public/ dir.
cp /home/site/wwwroot/deploy/nginx-default /etc/nginx/sites-available/default
service nginx reload

cd /home/site/wwwroot

# Run migrations (idempotent) and cache config/routes on each container start.
php artisan migrate --force --no-interaction
php artisan db:seed --class=DemoSeeder --force --no-interaction || true
php artisan config:cache
php artisan route:cache

# Queued email notifications. App Service Linux runs a single container, so the worker
# lives alongside nginx here rather than under systemd/supervisor. --max-time recycles it
# hourly so a fresh deploy's code is picked up; App Service restarts the startup command,
# which respawns it. Tune with QUEUE_TRIES / QUEUE_BACKOFF app settings.
php artisan queue:work --queue=default \
    --tries="${QUEUE_TRIES:-3}" \
    --backoff="${QUEUE_BACKOFF:-30}" \
    --max-time=3600 \
    --sleep=3 \
    --no-interaction &
