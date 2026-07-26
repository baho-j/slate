interface PagePlaceholderProps {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight text-n-900">{title}</h1>
      <p className="mt-1 text-sm text-n-500">{description}</p>
      <div className="mt-6 rounded-md border border-n-200 bg-white p-8 text-sm text-n-500">
        Nothing here yet.
      </div>
    </section>
  )
}
