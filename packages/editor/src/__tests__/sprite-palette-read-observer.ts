import type { AssetRole } from '@type-pal/content'
import { type AssetBase, AssetResolver } from '@type-pal/reforge'

/** A typed IO observer that delegates even non-configurable fixture role methods unchanged. */
export class PaletteReadObserver extends AssetResolver {
  readonly reads: Promise<string>[] = []
  private readonly delegate: AssetResolver

  constructor(base: AssetBase) {
    super(
      base.assetResolver.projectId,
      base.assetResolver.catalog,
      base.assetResolver.roles,
      base.source,
    )
    this.delegate = base.assetResolver
  }

  override readRoleText(role: AssetRole): Promise<string> {
    const pending = this.delegate.readRoleText(role)
    if (role === 'visual.standardColorTable') this.reads.push(pending)
    return pending
  }
}
