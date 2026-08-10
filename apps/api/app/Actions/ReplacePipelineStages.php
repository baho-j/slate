<?php

namespace App\Actions;

use App\Models\Application;
use App\Models\Pipeline;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ReplacePipelineStages
{
    /**
     * @param  array<int, array{id?: ?int, name: string, is_terminal: bool}>  $stages
     */
    public function handle(Pipeline $pipeline, array $stages, ?string $name = null): Pipeline
    {
        $keptIds = array_filter(array_column($stages, 'id'));
        $removed = $pipeline->stages()->whereNotIn('id', $keptIds)->pluck('name', 'id');

        $this->guardAgainstOccupiedStages($removed);

        return DB::transaction(function () use ($pipeline, $stages, $name, $removed) {
            if ($name !== null) {
                $pipeline->update(['name' => $name]);
            }

            $pipeline->stages()->whereIn('id', $removed->keys())->delete();

            foreach ($stages as $order => $stage) {
                $pipeline->stages()->updateOrCreate(
                    ['id' => $stage['id'] ?? null],
                    [
                        'name' => $stage['name'],
                        'order' => $order + 1,
                        'is_terminal' => $stage['is_terminal'],
                    ],
                );
            }

            return $pipeline->load('stages');
        });
    }

    /**
     * @param  Collection<int, string>  $removed
     */
    private function guardAgainstOccupiedStages(Collection $removed): void
    {
        if ($removed->isEmpty()) {
            return;
        }

        $occupied = Application::withoutGlobalScopes()
            ->whereIn('current_stage_id', $removed->keys())
            ->distinct()
            ->pluck('current_stage_id')
            ->map(fn (int $id) => $removed->get($id));

        if ($occupied->isNotEmpty()) {
            throw new ConflictHttpException(
                'Cannot delete stages that still hold applications: '.$occupied->implode(', ')
                .'. Move those applications to another stage first.'
            );
        }
    }
}
