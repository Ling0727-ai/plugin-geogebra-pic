/**
 * Guard the published artifact contract.
 *
 * A git-hosted install (`dsh plugin add github:...`) receives tracked files
 * only: it does not run `build`, and `build.mjs` needs the adjacent
 * deepseek-harness checkout. So the committed `lib/` **is** the shipped package,
 * and four things must hold or a consumer gets a plugin whose entry points
 * point at nothing and the Host Loader reports "failed to import":
 *
 * 1. every `main`/`exports` target exists and is non-empty;
 * 2. every `lib/` path declared in `files` exists (that list is explicit, so a
 *    missing entry is a broken tarball, not a harmless omission);
 * 3. those paths are tracked by git, not merely present in the worktree;
 * 4. `lib/` was built from the current sources.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILD_RECORD, sourceFingerprint } from './dist-manifest.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const manifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))

/** Every module path the manifest advertises to a consumer. */
const entryPoints = new Set()
if (typeof manifest.main === 'string') entryPoints.add(manifest.main)
for (const target of Object.values(manifest.exports ?? {})) {
  if (typeof target === 'string' && target.startsWith('./')) entryPoints.add(target.slice(2))
}

/** Build outputs the package publishes; an explicit list, never a glob. */
const published = (manifest.files ?? []).filter(entry => typeof entry === 'string' && entry.startsWith('lib/'))

for (const [relative, roles] of requiredArtifacts()) {
  requireArtifact(relative, roles)
}

/** Each artifact a consumer depends on, with every manifest role that names it. */
function requiredArtifacts() {
  const required = new Map()
  for (const path of entryPoints) required.set(path, new Set(['entry point']))
  for (const path of published) {
    if (!required.has(path)) required.set(path, new Set())
    required.get(path).add('declared in "files"')
  }
  return [...required].sort(([left], [right]) => (left < right ? -1 : 1))
}

/** Record one artifact's presence and size, naming every role that requires it. */
function requireArtifact(relative, roles) {
  const role = [...roles].join(', ')
  const path = join(projectRoot, relative)
  if (!existsSync(path)) {
    failures.push(`${relative}: missing (${role}) — a consumer would install a package that cannot be imported; run "pnpm build" and commit lib/`)
    return
  }
  if (statSync(path).size === 0) failures.push(`${relative}: empty (${role}) — run "pnpm build"`)
}

// A stale lib/ is functional but ships the previous revision, so compare the
// recorded input digest instead of trusting timestamps across checkouts.
const recordPath = join(projectRoot, BUILD_RECORD)
if (!existsSync(recordPath)) {
  failures.push(`${BUILD_RECORD}: missing — run "pnpm build" so the artifacts carry their input digest`)
} else {
  const recorded = JSON.parse(readFileSync(recordPath, 'utf8')).fingerprint
  if (recorded !== sourceFingerprint(projectRoot)) {
    failures.push('lib/ is stale: src/ or the build config changed after the last build — run "pnpm build" and commit lib/')
  }
}

// Presence in the worktree is not enough: the git tarball a consumer installs
// carries tracked files only, which is how lib/ went missing in the first place.
// An unpacked tarball has no repository to compare against, so that case skips
// the check rather than failing a consumer's build.
if (!isGitWorkTree()) {
  console.log('Not a git worktree: skipped the tracked-artifact check.')
} else {
  const candidates = [...new Set([...entryPoints, ...published, BUILD_RECORD])]
    .sort()
    .filter(relative => existsSync(join(projectRoot, relative)))
  const tracked = new Set(
    execFileSync('git', ['ls-files', '-z', '--', ...candidates], { cwd: projectRoot, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean),
  )
  for (const relative of candidates) {
    if (!tracked.has(relative)) {
      failures.push(`${relative}: present but not tracked by git — a git-hosted install would not receive it; commit lib/`)
    }
  }
}

/** Whether the project sits in a repository whose index can be queried. */
function isGitWorkTree() {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() === 'true'
  } catch {
    return false
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Published artifacts are valid (${entryPoints.size} entry points, ${published.length} published files).`)
}
