// Static checks on the source tree for the v2 plan's invariants.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { pglite } from './helpers/test-db'

const root = process.cwd()

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((name) => {
    const rel = path.join(dir, name)
    if (statSync(path.join(root, rel)).isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(name) ? [rel.replace(/\\/g, '/')] : []
  })
}

const files = ['app', 'components', 'lib', 'types'].flatMap(sourceFiles).concat('proxy.ts')
const read = (f: string) => readFileSync(path.join(root, f), 'utf8')
/** Source without comments, so explanations of a rule don't trip the rule. */
const code = (f: string) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('v2 invariants', () => {
  it('has no Supabase, community_code or tenant helper left (M-006)', () => {
    for (const file of files) {
      const text = code(file)
      expect(text, file).not.toMatch(/supabase|getSessionWithCommunity|community_code|communityCode/i)
    }
  })

  it('reads phone/Viber for other people only in the contact route (R-004)', () => {
    // Files allowed to mention the contact columns: the reveal endpoint, your
    // own profile and signup, validation, and the TypeScript types.
    const allowed = new Set([
      'app/api/slots/[id]/contact/route.ts',
      'app/api/profile/route.ts',
      'app/api/auth/signup/route.ts',
      'lib/validation/api-schemas.ts',
      'types/database.ts',
      'components/slots/ContactReveal.tsx',
      'app/profile/page.tsx',
      'app/(auth)/register/RegisterForm.tsx',
    ])
    const offenders = files.filter((f) => !allowed.has(f) && /\bcontact_viber\b|u\.phone\b/.test(code(f)))
    expect(offenders).toEqual([])
  })

  it('keeps pg and bcrypt out of the proxy (C-005)', () => {
    const proxy = code('proxy.ts')
    const config = code('lib/auth/auth.config.ts')
    expect(proxy).not.toMatch(/from ['"]@\/lib\/auth\/auth['"]|lib\/db|bcrypt|['"]pg['"]/)
    expect(config).not.toMatch(/^\s*(import|export)[^\n]*['"]\.\/auth['"]/m)
    expect(config).not.toMatch(/^\s*import[^\n]*(lib\/db|bcrypt|['"]pg['"])/m)
  })

  it('can re-run every migration (they are applied to fresh and existing databases)', async () => {
    const dir = path.join(root, 'db', 'migrations')
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await expect(pglite.exec(readFileSync(path.join(dir, file), 'utf8'))).resolves.toBeDefined()
    }
  })
})
