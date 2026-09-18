import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

const target = process.argv[2]
if (!target) throw new Error('Usage: npm run gen:comp <Component[/Child]>')
const name = basename(target)
const directory = join('src', 'components', target)
await mkdir(directory, { recursive: true })
await Promise.all([
  writeFile(join(directory, `${name}.tsx`), `export function ${name}() { return null }\n`, { flag: 'wx' }),
  writeFile(join(directory, `${name}.ts`), `export {}\n`, { flag: 'wx' }),
  writeFile(join(directory, `${name}.data.ts`), `export {}\n`, { flag: 'wx' }),
  writeFile(join(directory, `${name}.api.ts`), `export {}\n`, { flag: 'wx' }),
])
