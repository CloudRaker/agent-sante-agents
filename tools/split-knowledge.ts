// Splits large knowledge files into parts, so that one embedding call of the Run index stays small.
// The Run indexer sends all chunks of one file (up to 100) in one embedding call.
// A file with too much chunk text can make that call fail. This script keeps each part under PART_CHARS.
//
// Usage: bun tools/split-knowledge.ts [--dry-run] [--max-total <chars>] [--max-padded <chars>]
// Run it after each import of the crawl output into knowledge/.
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dir, '..', 'knowledge')
const PART_CHARS = 30_000
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const opt = (name: string, def: number) => {
  const i = args.indexOf(name)
  return i >= 0 ? Number(args[i + 1]) : def
}
const MAX_TOTAL = opt('--max-total', 48_000)
const MAX_PADDED = opt('--max-padded', 100_000)

// Estimate of the Run indexer chunks: a new chunk at each `#` to `###` heading, paragraphs packed
// to about 1,500 chars, hard cap 2,000, and a `{title} > {headings}` prefix on each chunk.
function estimate(title: string, body: string): { total: number; padded: number } {
  const sizes: number[] = []
  let prefix = title.length
  let cur = 0
  const flush = () => {
    if (cur) sizes.push(cur + prefix + 2)
    cur = 0
  }
  for (const para of body.split(/\n{2,}/)) {
    for (const piece of para.split(/\n(?=#{1,3}\s)/)) {
      const h = /^#{1,3}\s+(.+)/.exec(piece)
      if (h) {
        flush()
        prefix = title.length + h[1].length + 3
      }
      const len = h ? piece.length - h[0].length : piece.length
      if (cur && cur + len > 1_500) flush()
      cur += len + 2
      while (cur > 2_000) {
        sizes.push(2_000 + prefix + 2)
        cur -= 2_000
      }
    }
  }
  flush()
  const total = sizes.reduce((a, b) => a + b, 0)
  const padded = sizes.length * Math.max(0, ...sizes)
  return { total, padded }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return name.endsWith('.md') ? [p] : []
  })
}

/** Sections start at a heading line. A section over PART_CHARS is cut at blank lines. */
function sections(lines: string[]): string[][] {
  const out: string[][] = []
  let cur: string[] = []
  for (const line of lines) {
    if (/^#{1,6} /.test(line) && cur.length) {
      out.push(cur)
      cur = []
    }
    cur.push(line)
  }
  if (cur.length) out.push(cur)
  return out.flatMap((sec) => {
    if (sec.join('\n').length <= PART_CHARS) return [sec]
    const head = /^#{1,6} /.test(sec[0]) ? sec[0] : undefined
    const pieces: string[][] = []
    let piece: string[] = []
    let size = 0
    for (const line of sec) {
      if (size > PART_CHARS && line.trim() === '') {
        pieces.push(piece)
        piece = head ? [head, ''] : []
        size = 0
      }
      piece.push(line)
      size += line.length + 1
    }
    if (piece.length) pieces.push(piece)
    return pieces
  })
}

for (const file of walk(ROOT).sort()) {
  if (/-part-\d+\.md$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (!m) continue
  const front = m[1]
  const title = /^title:\s*"?(.*?)"?\s*$/m.exec(front)?.[1] ?? ''
  const body = text.slice(m[0].length)
  const size = estimate(title, body)
  if (size.total <= MAX_TOTAL && size.padded <= MAX_PADDED) continue

  const lines = body.split('\n')
  // The preamble is the H1 line and the official source line. Every part repeats it.
  const firstSection = lines.findIndex((l, i) => i > 0 && /^#{2,6} /.test(l))
  const pre = firstSection > 0 ? lines.slice(0, firstSection) : []
  const rest = firstSection > 0 ? lines.slice(firstSection) : lines
  const parts: string[][] = []
  let part: string[] = []
  let partSize = 0
  for (const sec of sections(rest)) {
    const s = sec.join('\n').length
    if (part.length && partSize + s > PART_CHARS) {
      parts.push(part)
      part = []
      partSize = 0
    }
    part.push(...sec)
    partSize += s + 1
  }
  if (part.length) parts.push(part)
  if (parts.length < 2) continue

  const rel = relative(ROOT, file)
  console.log(`${rel}: total ${size.total}, padded ${size.padded} -> ${parts.length} parts`)
  if (dryRun) continue
  parts.forEach((p, i) => {
    const out = `---\n${front}\npart: "${i + 1}/${parts.length}"\n---\n${[...pre, ...p].join('\n').replace(/\n*$/, '\n')}`
    writeFileSync(file.replace(/\.md$/, `-part-${i + 1}.md`), out)
  })
  unlinkSync(file)
}
