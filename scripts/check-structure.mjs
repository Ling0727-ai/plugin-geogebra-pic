import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'src', 'components')
const failures = []
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (!statSync(path).isDirectory()) continue
    const name = entry
    for (const suffix of ['.tsx', '.ts', '.data.ts', '.api.ts']) {
      if (!existsSync(join(path, `${name}${suffix}`))) failures.push(`${path}: missing ${name}${suffix}`)
    }
    walk(path)
  }
}
if (existsSync(root)) walk(root)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('Component structure is valid.')
}
