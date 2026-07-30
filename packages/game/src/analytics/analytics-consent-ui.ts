import {
  type ConsentStorage,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics-consent.js'

export interface AnalyticsConsentUiOptions {
  document: Document
  storage: ConsentStorage | undefined
  eventTarget: EventTarget | undefined
  privacySignal?: boolean
}

export interface AnalyticsConsentUi {
  destroy(): void
}

function applySharedButtonStyle(button: HTMLButtonElement): void {
  button.type = 'button'
  button.style.padding = '6px 10px'
  button.style.color = '#f0e0b0'
  button.style.background = '#281818'
  button.style.border = '1px solid #8d7043'
  button.style.borderRadius = '2px'
  button.style.font = '12px monospace'
  button.style.cursor = 'pointer'
}

export function mountAnalyticsConsentUi(options: AnalyticsConsentUiOptions): AnalyticsConsentUi {
  const existing = options.document.querySelector<HTMLElement>('[data-analytics-consent-root]')
  existing?.remove()

  const root = options.document.createElement('div')
  root.dataset.analyticsConsentRoot = ''

  const panel = options.document.createElement('aside')
  panel.dataset.testid = 'analytics-consent-panel'
  panel.setAttribute('aria-label', '可选访问统计')
  panel.style.position = 'fixed'
  panel.style.bottom = '16px'
  panel.style.left = '50%'
  panel.style.zIndex = '19'
  panel.style.width = 'min(560px, calc(100vw - 32px))'
  panel.style.boxSizing = 'border-box'
  panel.style.padding = '10px 12px'
  panel.style.transform = 'translateX(-50%)'
  panel.style.color = '#d8c9a6'
  panel.style.background = 'rgba(17, 12, 12, 0.96)'
  panel.style.border = '1px solid #6b5435'
  panel.style.boxShadow = '0 0 14px rgba(0, 0, 0, 0.65)'
  panel.style.font = '12px/1.5 monospace'

  const copy = options.document.createElement('div')
  copy.textContent = options.privacySignal
    ? '检测到浏览器隐私信号，访问统计已默认关闭。你仍可明确允许仅发送一次页面浏览。'
    : '是否允许仅统计本页浏览？不会发送按键、进度、战斗、存档或其他游戏事件。'

  const policy = options.document.createElement('a')
  policy.href = 'https://illegalscreed.cn/zh/privacy'
  policy.target = '_blank'
  policy.rel = 'noopener noreferrer'
  policy.textContent = '隐私政策'
  policy.style.marginLeft = '8px'
  policy.style.color = '#d8b365'

  const actions = options.document.createElement('div')
  actions.style.display = 'flex'
  actions.style.justifyContent = 'flex-end'
  actions.style.gap = '8px'
  actions.style.marginTop = '8px'

  const denied = options.document.createElement('button')
  applySharedButtonStyle(denied)
  denied.dataset.choice = 'denied'
  denied.textContent = '拒绝'

  const granted = options.document.createElement('button')
  applySharedButtonStyle(granted)
  granted.dataset.choice = 'granted'
  granted.textContent = '允许'
  granted.style.background = '#6b231c'

  const preferences = options.document.createElement('button')
  applySharedButtonStyle(preferences)
  preferences.dataset.testid = 'analytics-preferences'
  preferences.textContent = '隐私设置'
  preferences.setAttribute('aria-label', '重新打开访问统计设置')
  preferences.style.position = 'fixed'
  preferences.style.right = '10px'
  preferences.style.bottom = '10px'
  preferences.style.zIndex = '19'

  actions.append(denied, granted)
  copy.append(policy)
  panel.append(copy, actions)
  root.append(panel, preferences)
  options.document.body.append(root)

  const showPanel = (): void => {
    panel.hidden = false
    preferences.hidden = true
  }
  const showPreferences = (): void => {
    panel.hidden = true
    preferences.hidden = false
  }
  const choose = (consent: 'granted' | 'denied'): void => {
    if (!writeAnalyticsConsent(consent, options.storage, options.eventTarget)) return
    showPreferences()
  }

  denied.addEventListener('click', () => choose('denied'))
  granted.addEventListener('click', () => choose('granted'))
  preferences.addEventListener('click', showPanel)

  if (readAnalyticsConsent(options.storage) === 'unset') showPanel()
  else showPreferences()

  return {
    destroy(): void {
      root.remove()
    },
  }
}
