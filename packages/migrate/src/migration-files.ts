/** JSON file publication contract, independent of any source converter. */
export type MigrationJson =
  | null
  | boolean
  | number
  | string
  | MigrationJson[]
  | { [key: string]: MigrationJson }
export interface MigrationFileSet {
  files: Map<string, MigrationJson>
  managedFiles: Set<string>
}
