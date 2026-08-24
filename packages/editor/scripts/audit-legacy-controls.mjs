import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { printAdoptionMatrix, runDesignSystemGate } from './design-system-audit.mjs'

const mode = process.argv[2]

if (mode === '--gate') process.exitCode = runDesignSystemGate()
else if (mode === '--matrix') process.exitCode = printAdoptionMatrix()
else {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../src/ui')

  function filesUnder(directory) {
    return readdirSync(directory).flatMap((entry) => {
      const path = join(directory, entry)
      return statSync(path).isDirectory() ? filesUnder(path) : [path]
    })
  }

  const sources = filesUnder(root)
    .filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    .sort()

  const sourceText = sources.map((path) => readFileSync(path, 'utf8'))
  const countMatches = (source, pattern) => source.match(pattern)?.length ?? 0
  const tagCounts = Object.fromEntries(
    ['button', 'input', 'select', 'textarea', 'label', 'img'].map((tag) => [
      tag,
      sourceText.reduce(
        (total, source) => total + countMatches(source, new RegExp(`<${tag}\\b`, 'g')),
        0,
      ),
    ]),
  )
  const componentCounts = Object.fromEntries(
    ['DsButton', 'DsIconButton', 'DsActionLink', 'DsToolbar', 'DsMenuItem'].map((component) => [
      component,
      sourceText.reduce(
        (total, source) => total + countMatches(source, new RegExp(`<${component}\\b`, 'g')),
        0,
      ),
    ]),
  )

  // Keep this matcher and token boundary identical to design-system/boundary.test.ts.
  const classNamePattern = /className\s*=\s*(?:"[^"]*"|'[^']*'|\{`[\s\S]*?`\}|\{"[^"]*"\})/g
  const legacyTokens = [
    'in',
    'tool',
    'btn',
    'mini',
    'mini-txt',
    'pv-btn',
    'item-action-button',
    'mini-icon',
    'media-zoom-controls',
  ]
  const legacyClassCounts = Object.fromEntries(
    legacyTokens.map((token) => {
      const tokenPattern = new RegExp(`(?<![\\w-])${token.replace('-', '\\-')}(?![\\w-])`, 'g')
      const count = sourceText.reduce((total, source) => {
        const classNames = source.match(classNamePattern) ?? []
        return (
          total +
          classNames.reduce((sum, className) => sum + countMatches(className, tokenPattern), 0)
        )
      }, 0)
      return [token, count]
    }),
  )

  console.log(
    JSON.stringify(
      {
        scope: {
          root: relative(process.cwd(), root),
          files: sources.length,
          include: '*.tsx',
          exclude: ['*.test.tsx', 'src/ui/design-system/**'],
        },
        regex: {
          className: classNamePattern.source,
          tokenBoundary: '(?<![\\w-])TOKEN(?![\\w-])',
        },
        tags: tagCounts,
        nativeCheckboxes: sourceText.reduce(
          (total, source) => total + countMatches(source, /\btype\s*=\s*["']checkbox["']/g),
          0,
        ),
        inlineStyleObjects: sourceText.reduce(
          (total, source) => total + countMatches(source, /style=\{\{/g),
          0,
        ),
        sharedComponents: componentCounts,
        legacyClasses: legacyClassCounts,
      },
      null,
      2,
    ),
  )
}
