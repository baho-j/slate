import type { RequirementPreview } from './criteria-preview'
import type { ApplicationFieldDefinition } from './types'

interface RequirementsPreviewProps {
  requirements: RequirementPreview[]
  fields: ApplicationFieldDefinition[]
}

const marks: Record<RequirementPreview['state'], { icon: string; className: string }> = {
  met: { icon: '✓', className: 'text-success' },
  unmet: { icon: '×', className: 'text-danger' },
  unanswered: { icon: '•', className: 'text-n-400' },
}

export function RequirementsPreview({ requirements, fields }: RequirementsPreviewProps) {
  if (requirements.length === 0) {
    return null
  }

  const labelFor = (key: string) => fields.find((field) => field.key === key)?.label ?? key

  return (
    <section aria-labelledby="requirements-heading" className="rounded-lg border border-n-200 p-4">
      <h3 id="requirements-heading" className="text-sm font-medium text-n-900">
        Requirements
      </h3>

      <ul className="mt-2 space-y-1">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="flex items-center gap-2 text-sm text-n-700">
            <span aria-hidden className={marks[requirement.state].className}>
              {marks[requirement.state].icon}
            </span>
            <span>{labelFor(requirement.fieldKey)}</span>
            <span className="sr-only">
              {requirement.state === 'met'
                ? 'met'
                : requirement.state === 'unmet'
                  ? 'not met'
                  : 'not answered yet'}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-n-500">
        This is a guide only. Your application is assessed by our team after you submit.
      </p>
    </section>
  )
}
