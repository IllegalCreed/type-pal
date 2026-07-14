import {
  EDITOR_MODULES,
  type EditorLocation,
  type EditorModuleId,
  editorModule,
} from './editor-navigation.js'

export function ModuleNav(props: {
  activeModule: EditorModuleId
  compact: boolean
  forcedCompact: boolean
  onModule: (module: EditorModuleId) => void
  onToggle: () => void
}) {
  const { activeModule, compact, forcedCompact, onModule, onToggle } = props
  return (
    <nav className={`module-nav${compact ? ' compact' : ''}`} aria-label="编辑器模块">
      <div className="module-nav-items">
        {EDITOR_MODULES.map((module) => (
          <button
            type="button"
            key={module.id}
            className={`module-nav-item${module.id === activeModule ? ' active' : ''}`}
            title={compact ? module.label : undefined}
            aria-label={module.label}
            aria-current={module.id === activeModule ? 'page' : undefined}
            onClick={() => onModule(module.id)}
          >
            <span className="module-nav-icon" aria-hidden="true">
              {module.icon}
            </span>
            <span className="module-nav-label">{module.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="module-nav-toggle"
        title={forcedCompact ? '窄窗口自动收起' : compact ? '展开模块导航' : '收起模块导航'}
        aria-label={forcedCompact ? '窄窗口自动收起' : compact ? '展开模块导航' : '收起模块导航'}
        disabled={forcedCompact}
        onClick={onToggle}
      >
        <span
          className={`panel-resizer-toggle-icon panel-resizer-toggle-icon-${compact ? 'right' : 'left'}`}
          aria-hidden="true"
        />
        <span className="module-nav-label">{forcedCompact ? '自动收起' : '收起'}</span>
      </button>
    </nav>
  )
}

export function ModuleSubnav(props: {
  location: EditorLocation
  onNavigate: (location: EditorLocation) => void
}) {
  const { location, onNavigate } = props
  const module = editorModule(location.module)
  if (module.subpages.length <= 1) return null
  return (
    <div className="module-subnav" role="tablist" aria-label={`${module.label}子页`}>
      {module.subpages.map((subpage) => (
        <button
          type="button"
          role="tab"
          key={subpage.id}
          className={`module-subnav-item${subpage.id === location.subpage ? ' active' : ''}`}
          aria-selected={subpage.id === location.subpage}
          onClick={() => onNavigate({ module: module.id, subpage: subpage.id })}
        >
          <span aria-hidden="true">{subpage.icon}</span>
          <span>{subpage.label}</span>
        </button>
      ))}
    </div>
  )
}
