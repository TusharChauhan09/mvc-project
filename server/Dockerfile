# syntax=docker/dockerfile:1.6
FROM php:8.3-cli-alpine AS base

RUN apk add --no-cache \
        git curl unzip icu-dev libzip-dev oniguruma-dev postgresql-dev \
        libpng-dev libjpeg-turbo-dev freetype-dev autoconf g++ make \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo pdo_pgsql pgsql bcmath intl zip mbstring opcache gd \
    && apk del autoconf g++ make

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

FROM base AS deps
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --no-progress

FROM base AS app
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

COPY --from=deps /app/vendor /app/vendor
COPY . /app

RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/framework/{cache,sessions,views} bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 8080

CMD ["sh", "-c", "php artisan migrate --force && php artisan config:cache && php artisan route:cache && php -S 0.0.0.0:${PORT:-8080} -t public public/index.php"]
