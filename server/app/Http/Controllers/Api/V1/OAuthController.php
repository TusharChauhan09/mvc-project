<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class OAuthController extends Controller
{
    private const SUPPORTED = ['google', 'github'];

    public function redirect(string $provider): JsonResponse|RedirectResponse
    {
        if (! $this->supported($provider)) {
            return response()->json(['message' => 'Unsupported provider.'], 404);
        }

        return Socialite::driver($provider)
            ->stateless()
            ->redirect();
    }

    public function callback(string $provider): RedirectResponse|JsonResponse
    {
        if (! $this->supported($provider)) {
            return response()->json(['message' => 'Unsupported provider.'], 404);
        }

        try {
            $oauthUser = Socialite::driver($provider)->stateless()->user();
        } catch (InvalidStateException $e) {
            return $this->bounceWithError('invalid_state');
        } catch (\Throwable $e) {
            Log::warning('OAuth callback failure', ['provider' => $provider, 'error' => $e->getMessage()]);
            return $this->bounceWithError('oauth_failed');
        }

        $email = $oauthUser->getEmail();
        if (! $email) {
            return $this->bounceWithError('email_missing');
        }

        $user = User::where('provider', $provider)
            ->where('provider_id', $oauthUser->getId())
            ->first();

        if (! $user) {
            $user = User::where('email', $email)->first();

            if ($user) {
                $user->update([
                    'provider' => $provider,
                    'provider_id' => $oauthUser->getId(),
                    'avatar_url' => $oauthUser->getAvatar() ?: $user->avatar_url,
                ]);
            } else {
                $user = User::create([
                    'name' => $oauthUser->getName() ?: $oauthUser->getNickname() ?: Str::before($email, '@'),
                    'email' => $email,
                    'password' => null,
                    'role' => Role::Reviewer->value,
                    'provider' => $provider,
                    'provider_id' => $oauthUser->getId(),
                    'avatar_url' => $oauthUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);
            }
        }

        $token = $user->createToken('oauth:'.$provider)->plainTextToken;

        return $this->bounceWithToken($token);
    }

    private function supported(string $provider): bool
    {
        return in_array($provider, self::SUPPORTED, true);
    }

    private function bounceWithToken(string $token): RedirectResponse
    {
        $base = config('services.oauth.frontend_redirect');
        $sep = str_contains($base, '?') ? '&' : '?';
        return redirect()->away($base.$sep.'token='.urlencode($token));
    }

    private function bounceWithError(string $error): RedirectResponse
    {
        $base = config('services.oauth.frontend_redirect');
        $sep = str_contains($base, '?') ? '&' : '?';
        return redirect()->away($base.$sep.'error='.urlencode($error));
    }
}
