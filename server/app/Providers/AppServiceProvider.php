<?php

namespace App\Providers;

use App\Services\Books\BookSearchService;
use App\Services\Books\GoogleBooksService;
use App\Services\Books\GutendexService;
use App\Services\Books\OpenLibraryService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            GoogleBooksService::class,
            fn () => new GoogleBooksService(
                apiKey: config('services.google_books.key'),
                cacheTtl: (int) config('services.google_books.cache_ttl', 3600),
            )
        );

        $this->app->singleton(
            OpenLibraryService::class,
            fn () => new OpenLibraryService(
                cacheTtl: (int) config('services.open_library.cache_ttl', 3600),
            )
        );

        $this->app->singleton(
            GutendexService::class,
            fn () => new GutendexService(
                cacheTtl: (int) config('services.gutendex.cache_ttl', 3600),
            )
        );

        $this->app->singleton(
            BookSearchService::class,
            fn ($app) => new BookSearchService([
                $app->make(GoogleBooksService::class),
                $app->make(OpenLibraryService::class),
            ])
        );
    }

    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request) {
            return [
                Limit::perMinute(20)->by($request->ip()),
                Limit::perMinute(5)->by((string) $request->input('email')),
            ];
        });

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
