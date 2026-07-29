import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast-context'
import { useCloseJob, usePublishJob } from './hooks'
import type { Job } from './types'

interface JobRowActionsProps {
  job: Job
  onEdit: (job: Job) => void
}

export function JobRowActions({ job, onEdit }: JobRowActionsProps) {
  const { toast } = useToast()
  const publishJob = usePublishJob()
  const closeJob = useCloseJob()

  function handlePublish() {
    publishJob.mutate(job.id, {
      onSuccess: () => toast('Job published.', 'success'),
      onError: () => toast('Could not publish the job.', 'danger'),
    })
  }

  function handleClose() {
    closeJob.mutate(job.id, {
      onSuccess: () => toast('Job closed.', 'success'),
      onError: () => toast('Could not close the job.', 'danger'),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${job.title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(job)}>Edit</DropdownMenuItem>
        {job.status === 'draft' && (
          <DropdownMenuItem onSelect={handlePublish}>Publish</DropdownMenuItem>
        )}
        {job.status === 'published' && (
          <DropdownMenuItem onSelect={handleClose}>Close</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
