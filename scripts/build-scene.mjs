// Pre-build: bundle the hero scene (three + journey) as a standalone ES module so it can start before React hydrates.
// Rapier stays a separate, lazily loaded chunk. Output: public/scene/boot.js (+ chunks) and public/scene/manifest.json.
import { build } from 'esbuild'
import { rmSync, mkdirSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const out = join(process.cwd(), 'public', 'scene')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
await build({
  entryPoints: [join(process.cwd(), 'src/components/marketing/scene/boot.ts')],
  bundle: true, format: 'esm', splitting: true, outdir: out, minify: true, target: ['es2020'], sourcemap: false,
  chunkNames: 'chunk-[hash]', entryNames: 'boot',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
})
const files = readdirSync(out).filter((f) => f.endsWith('.js'))
const hash = createHash('sha1')
for (const f of files.sort()) hash.update(f).update(String(statSync(join(out, f)).size))
const v = hash.digest('hex').slice(0, 10)
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ v, files }))
console.log(`build-scene: ${files.join(', ')} (v=${v})`)
