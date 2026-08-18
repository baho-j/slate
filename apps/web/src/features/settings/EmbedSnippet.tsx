import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function EmbedSnippet({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  const [copied, setCopied] = useState(false)

  const embedUrl = `${window.location.origin}/embed/o/${orgSlug}`
  const snippet = `<iframe
  src="${embedUrl}"
  title="Careers at ${orgName}"
  width="100%"
  height="720"
  style="border:0;max-width:100%"
  loading="lazy"
></iframe>`

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-n-700">Embed your careers list</h2>
        <p className="text-sm text-n-500">
          Paste this snippet into your own site to show your open roles inline.
        </p>
      </div>

      <div className="relative">
        <pre className="overflow-x-auto rounded-md border border-n-200 bg-n-50 p-4 text-xs text-n-800">
          <code>{snippet}</code>
        </pre>
        <Button
          variant="secondary"
          size="sm"
          className="absolute right-2 top-2"
          onClick={copy}
          aria-label="Copy embed snippet"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <p className="text-sm text-n-500">
        Preview it at{' '}
        <a
          href={embedUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:text-accent-hover"
        >
          {embedUrl}
        </a>
        .
      </p>
    </section>
  )
}
