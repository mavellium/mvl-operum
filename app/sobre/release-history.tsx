import { readFileSync } from 'node:fs'
import path from 'node:path'
import { compareVersions, parseReleaseNotes, type ReleaseItem, type ReleaseNotes } from '@/lib/release-notes'

function InlineText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="break-words rounded bg-gray-100 px-1 text-xs">{part.slice(1, -1)}</code>
    return part
  })
}

function Items({ items }: { items: ReleaseItem[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600">
      {items.map((item, index) => (
        <li key={index}>
          <InlineText text={item.text} />
          {item.children.length > 0 && <div className="mt-2"><Items items={item.children} /></div>}
        </li>
      ))}
    </ul>
  )
}

function ReleaseContent({ release }: { release: ReleaseNotes }) {
  return (
    <div className="space-y-4">
      {release.sections.map((section, index) => (
        <div key={index}>
          {section.title && <h4 className="mb-2 text-sm font-semibold text-gray-900">{section.title}</h4>}
          <Items items={section.items} />
        </div>
      ))}
    </div>
  )
}

function ReleaseLabel({ label }: { label: string }) {
  return <span>{label.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2/$1')}</span>
}

export function ReleaseHistory({ version }: { version: string }) {
  const releases = parseReleaseNotes(readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8'))
  const current = releases.find(release => release.version === version)
  if (!current) throw new Error(`CHANGELOG.md não contém a versão atual ${version}`)
  const previous = releases.filter(release => compareVersions(release.version, version) < 0)
    .sort((a, b) => compareVersions(b.version, a.version))

  return (
    <section aria-labelledby="release-history-title" className="mb-8 space-y-5">
      <div>
        <h2 id="release-history-title" className="text-xl font-bold text-gray-900">Novidades e atualizações</h2>
        <p className="mt-1 text-sm text-gray-500">Confira o que mudou em cada versão do Operum.</p>
      </div>
      <article className="rounded-xl border border-blue-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Versão {current.version}</h3>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Versão atual</span>
          <p className="w-full text-sm text-gray-500"><ReleaseLabel label={current.label} /></p>
        </div>
        <ReleaseContent release={current} />
      </article>
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Versões anteriores</h3>
        <div className="space-y-3">
          {previous.map(release => (
            <details key={release.version} className="group rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer rounded-xl p-5 text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-blue-600">
                Versão {release.version}
                <span className="ml-2 font-normal text-gray-500"><ReleaseLabel label={release.label} /></span>
              </summary>
              <div className="border-t border-gray-100 px-5 pb-5 pt-4"><ReleaseContent release={release} /></div>
            </details>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">O histórico até a versão 1.6.0 foi reconstruído a partir dos registros do projeto.</p>
      </div>
    </section>
  )
}
