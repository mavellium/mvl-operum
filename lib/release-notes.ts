export type ReleaseItem = { text: string; children: ReleaseItem[] }
export type ReleaseSection = { title?: string; items: ReleaseItem[] }
export type ReleaseNotes = { version: string; label: string; sections: ReleaseSection[] }

/** Subconjunto do Markdown usado no CHANGELOG: versões, seções e listas aninhadas. */
export function parseReleaseNotes(markdown: string): ReleaseNotes[] {
  const releases: ReleaseNotes[] = []
  let release: ReleaseNotes | undefined
  let section: ReleaseSection | undefined
  let parent: ReleaseItem | undefined
  let lastItem: ReleaseItem | undefined

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const match = /^## \[(\d+\.\d+\.\d+)\]\s*(?:—\s*)?(.*)$/.exec(line)
      release = match ? { version: match[1], label: match[2], sections: [] } : undefined
      if (release) releases.push(release)
      section = undefined
      parent = undefined
      lastItem = undefined
      continue
    }
    if (!release) continue
    if (line.startsWith('### ')) {
      section = { title: line.slice(4), items: [] }
      release.sections.push(section)
      parent = undefined
      lastItem = undefined
      continue
    }
    const bullet = /^(\s*)- (.+)$/.exec(line)
    if (bullet) {
      if (!section) {
        section = { items: [] }
        release.sections.push(section)
      }
      const item: ReleaseItem = { text: bullet[2], children: [] }
      if (bullet[1].length && parent) parent.children.push(item)
      else {
        section.items.push(item)
        parent = item
      }
      lastItem = item
    } else if (line.trim() && lastItem) {
      lastItem.text += ` ${line.trim()}`
    }
  }
  return releases
}

export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i]
  }
  return 0
}
