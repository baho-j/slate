import { createFileRoute } from '@tanstack/react-router'
import { MyInterviewsPage } from '@/features/interviews/MyInterviewsPage'

export const Route = createFileRoute('/_app/interviews')({
  component: MyInterviewsPage,
})
