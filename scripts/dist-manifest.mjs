/**
 * Fingerprint of the inputs that decide what the committed `lib/` must contain.
 *
 * `lib/` is tracked in git because a git-hosted DSH install
 * (`dsh plugin add github:...`) copies tracked files only — it never runs
 * `build`, and `build.mjs` needs the adjacent deepseek-harness checkout. Keeping
 * build output in git creates the opposite hazard: editing `src/` and forgetting
 * to rebuild. The build records this digest next to the artifacts and
 * `check-dist.mjs` recomputes it, so staleness is detected from content rather
 * than from filesystem timestamps, which a fresh clone does not preserve.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Directories whose contents are compiled into `lib/`. */
const INPUT_DIRECTORIES = ['src']

/** Manifests and build config that change the emitted shape. */
const INPUT_FILES = ['package.json', 'tsdown.config.ts']

/** Path of the build record, relative to the project root. */
export const BUILD_RECORD = 'lib/.build.json'

/** Every build input, absolute and name-sorted so the digest is order-stable. */
function inputPaths(projectRoot) {
  const paths = []
  for (const directory of INPUT_DIRECTORIES) {
    const root = join(projectRoot, directory)
    const walk = current => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (entry.isFile()) paths.push(path)
      }
    }
    try {
      statSync(root)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      continue
    }
    walk(root)
  }
  for (const file of INPUT_FILES) {
    const path = join(projectRoot, file)
    try {
      statSync(path)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      continue
    }
    paths.push(path)
  }
  return paths.sort()
}

/**
 * Digest every build input, including the path that produced it so a rename
 * counts as a change.
 * @param projectRoot - absolute plugin root.
 * @returns `sha256-<hex>` over the sorted inputs.
 */
export function sourceFingerprint(projectRoot) {
  const hash = createHash('sha256')
  for (const path of inputPaths(projectRoot)) {
    hash.update(relative(projectRoot, path).split(sep).join('/'))
    hash.update('\0')
    hash.update(readFileSync(path))
    hash.update('\0')
  }
  return `sha256-${hash.digest('hex')}`
}
