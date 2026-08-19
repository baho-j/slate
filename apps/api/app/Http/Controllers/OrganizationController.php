<?php

namespace App\Http\Controllers;

use App\Http\Requests\Organizations\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Services\LogoStorage;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrganizationController extends Controller
{
    public function __construct(private readonly LogoStorage $logos) {}

    public function current(Request $request): OrganizationResource
    {
        $organization = $request->user()->organization;

        $this->authorize('view', $organization);

        return OrganizationResource::make($organization);
    }

    public function update(UpdateOrganizationRequest $request): OrganizationResource
    {
        $organization = $request->user()->organization;
        $data = $request->safe()->except('logo_key');

        if ($request->exists('logo_key')) {
            $data['logo_path'] = $this->resolveLogo($request->input('logo_key'));
        }

        $organization->update($data);

        return OrganizationResource::make($organization->fresh());
    }

    private function resolveLogo(?string $key): ?string
    {
        if ($key === null) {
            return null;
        }

        $verification = $this->logos->verify($key);
        if (! $verification->ok) {
            throw ValidationException::withMessages(['logo_key' => $verification->error]);
        }

        return $this->logos->publicUrl($key);
    }
}
