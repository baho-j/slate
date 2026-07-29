import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { employmentTypeLabels } from './constants'
import { JobRowActions } from './JobRowActions'
import { JobStatusBadge } from './JobStatusBadge'
import type { Job } from './types'

interface JobsTableProps {
  jobs: Job[]
  isLoading: boolean
  onEdit: (job: Job) => void
}

const columnCount = 5

export function JobsTable({ jobs, isLoading, onEdit }: JobsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <SkeletonRows />
        ) : jobs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="py-10 text-center text-n-500">
              No jobs match your filters yet.
            </TableCell>
          </TableRow>
        ) : (
          jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium text-n-900">{job.title}</TableCell>
              <TableCell>{job.department ?? '—'}</TableCell>
              <TableCell>{employmentTypeLabels[job.employment_type]}</TableCell>
              <TableCell>
                <JobStatusBadge status={job.status} />
              </TableCell>
              <TableCell className="text-right">
                <JobRowActions job={job} onEdit={onEdit} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => index).map((index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
