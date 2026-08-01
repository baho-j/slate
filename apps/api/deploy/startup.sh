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
