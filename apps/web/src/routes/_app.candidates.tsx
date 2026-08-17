import { createFileRoute } from '@tanstack/react-router'
import { TalentPoolPage } from '@/features/talent-pool/TalentPoolPage'

export const Route = createFileRoute('/_app/candidates')({
  component: TalentPoolPage,
})
