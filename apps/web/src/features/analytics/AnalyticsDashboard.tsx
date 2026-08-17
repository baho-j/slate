import { Briefcase, CalendarCheck, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useJobs } from '@/features/jobs/hooks'
import { FunnelChart } from './FunnelChart'
import { useJobAnalytics, useOverview } from './hooks'
import { TimeInStageChart } from './TimeInStageChart'

export function AnalyticsDashboard() {
  const { data: overview, isLoading: loadingOverview } = useOverview(30)
  const { data: jobsPage } = useJobs({})
  const jobs = jobsPage?.data ?? []

  const [jobId, setJobId] = useState<string | undefined>()
  useEffect(() => {
    const first = jobs[0]
    if (!jobId && first) setJobId(first.id)
  }, [jobId, jobs])

  const { data: analytics, isLoading: loadingJob } = useJobAnalytics(jobId)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-n-900">Dashboard</h1>
        <p className="text-sm text-n-500">Hiring activity across your organisation.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={Briefcase}
          label="Open jobs"
          value={overview?.open_jobs}
          loading={loadingOverview}
        />
        <StatTile
          icon={FileText}
          label="Applications (30 days)"
          value={overview?.applications}
          loading={loadingOverview}
        />
        <StatTile
          icon={CalendarCheck}
          label="Interviews scheduled"
          value={overview?.interviews_scheduled}
          loading={loadingOverview}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-n-700">Pipeline analytics</h2>
          {jobs.length > 0 && (
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="sm:w-64" aria-label="Choose a job">
                <SelectValue placeholder="Choose a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="rounded-md border border-dashed border-n-200 p-10 text-center text-sm text-n-500">
            Create a job to see its pipeline analytics.
          </p>
        ) : loadingJob || !analytics ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-n-200 bg-white p-4">
              <h3 className="mb-4 text-sm font-medium text-n-700">Funnel</h3>
              <FunnelChart stages={analytics.funnel} />
            </div>
            <div className="rounded-md border border-n-200 bg-white p-4">
              <h3 className="mb-4 text-sm font-medium text-n-700">Time in stage</h3>
              <TimeInStageChart stages={analytics.time_in_stage} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <div className="rounded-md border border-n-200 bg-white p-4">
      <div className="flex items-center gap-2 text-n-500">
        <Icon className="size-4" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-1 text-3xl font-semibold text-n-900">{value ?? 0}</p>
      )}
    </div>
  )
}
