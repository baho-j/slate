import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'
import type { ApplicationListItem } from './types'

interface ApplicationsTableProps {
  jobId: string
  applications: ApplicationListItem[]
  isLoading: boolean
}

const columnCount = 4

export function ApplicationsTable({ jobId, applications, isLoading }: ApplicationsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <SkeletonRows />
        ) : applications.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="py-10 text-center text-n-500">
              No applications match your filters yet.
            </TableCell>
          </TableRow>
        ) : (
          applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell className="font-medium text-n-900">
                <Link
                  to="/jobs/$jobId/applications/$applicationId"
                  params={{ jobId, applicationId: application.id }}
                  className="hover:text-accent"
                >
                  {application.candidate.full_name}
                </Link>
                <span className="block text-xs font-normal text-n-500">
                  {application.candidate.email}
                </span>
              </TableCell>
              <TableCell className="text-n-500">
                {new Date(application.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-n-500">{application.current_stage?.name ?? '—'}</TableCell>
              <TableCell>
                <ApplicationStatusBadge status={application.status} />
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
      {Array.from({ length: 5 }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length skeleton placeholder
        <TableRow key={index}>
          {Array.from({ length: columnCount }).map((__, cell) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length skeleton placeholder
            <TableCell key={cell}>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
