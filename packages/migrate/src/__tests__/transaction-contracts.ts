// Compiler-only contracts, outside the runtime *.test.ts selection.
import { expectTypeOf } from 'vitest'
import type { commitMigrationTransaction, TransactionChange } from '../migration-transaction.js'

type Project = { target: string; scope: 'project' }
expectTypeOf<Project>().not.toExtend<TransactionChange>()
expectTypeOf<Project & { expectedPreviousHash: undefined }>().not.toExtend<TransactionChange>()
expectTypeOf<Project & { expectedPreviousHash: null }>().toExtend<TransactionChange>()
expectTypeOf<{
  target: string
  scope: 'baseline'
  expectedPreviousHash: null
}>().not.toExtend<TransactionChange>()
expectTypeOf<{
  target: string
  scope: 'manifest'
  expectedPreviousHash: null
}>().not.toExtend<TransactionChange>()
// With the current optional-property compiler setting this is typed; the runtime own-key guard rejects it.
expectTypeOf<{
  target: string
  scope: 'baseline'
  expectedPreviousHash: undefined
}>().toExtend<TransactionChange>()
expectTypeOf<Parameters<typeof commitMigrationTransaction>[1]>().toEqualTypeOf<
  readonly TransactionChange[]
>()
