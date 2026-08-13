<?php

namespace App\Actions;

use App\Models\Application;
use App\Models\PipelineStage;
use App\Notifications\ApplicationStageChanged;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class MoveApplicationStage
{
    public function handle(Application $application, PipelineStage $toStage, ?string $note): Application
    {
        $fromStageId = $application->current_stage_id;

        $application = DB::transaction(function () use ($application, $toStage, $fromStageId, $note) {
            $application->update(['current_stage_id' => $toStage->id]);

            $application->statusHistory()->create([
                'from_stage_id' => $fromStageId,
                'to_stage_id' => $toStage->id,
                'from_status' => $application->status->value,
                'to_status' => $application->status->value,
                'changed_by' => Auth::id(),
                'note' => $note,
            ]);

            return $application;
        });

        Notification::route('mail', $application->candidate->email)
            ->notify(new ApplicationStageChanged($application->load('job', 'candidate'), $toStage));

        return $application;
    }
}
