<?php

namespace App\Http\Controllers;

use App\Http\Requests\TalentPool\StoreTalentPoolEntryRequest;
use App\Http\Resources\TalentPoolEntryResource;
use App\Models\TalentPoolEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TalentPoolController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', TalentPoolEntry::class);

        $validated = $request->validate([
            'tag' => ['sometimes', 'string', 'max:40'],
            'q' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $entries = TalentPoolEntry::query()
            ->with(['candidate', 'addedBy'])
            ->when($validated['tag'] ?? null, fn ($query, $tag) => $query->whereJsonContains('tags', $tag))
            ->when($validated['q'] ?? null, fn ($query, $term) => $query->whereHas(
                'candidate',
                fn ($candidate) => $candidate->whereRaw(
                    "search_vector @@ plainto_tsquery('english', ?)", [$term]
                )
            ))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->cursorPaginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return TalentPoolEntryResource::collection($entries);
    }

    public function store(StoreTalentPoolEntryRequest $request): JsonResponse
    {
        $data = $request->validated();

        $entry = TalentPoolEntry::updateOrCreate(
            ['candidate_id' => $data['candidate_id']],
            [
                'tags' => $data['tags'] ?? [],
                'note' => $data['note'] ?? null,
                'added_by' => $request->user()->id,
            ],
        );

        return TalentPoolEntryResource::make($entry->load(['candidate', 'addedBy']))
            ->response()
            ->setStatusCode($entry->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(TalentPoolEntry $talentPoolEntry): JsonResponse
    {
        $this->authorize('delete', $talentPoolEntry);

        $talentPoolEntry->delete();

        return response()->json(status: 204);
    }
}
