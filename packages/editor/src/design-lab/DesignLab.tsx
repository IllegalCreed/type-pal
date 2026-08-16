import { useMemo, useState } from 'react'
import {
  DsActionLink,
  DsButton,
  DsCard,
  DsCheckbox,
  DsCombobox,
  DsDialog,
  DsDrawer,
  DsEmptyState,
  DsField,
  DsListHeader,
  type DsMediaBackground,
  DsMediaViewport,
  DsMenuBar,
  type DsMenuDefinition,
  DsMultiSelect,
  DsNumberInput,
  type DsOption,
  DsRadioGroup,
  DsSelect,
  DsStatus,
  DsSwitch,
  DsTabs,
  DsTextArea,
  DsTextInput,
  DsToolbar,
  type DsToolbarCommand,
  DsVirtualList,
  DsWorkbench,
  EDITOR_DESIGN_SYSTEM_VERSION,
} from '../ui/design-system/index.js'

const FIXTURES = Array.from(
  { length: 15 },
  (_, index) => `RF-${String(index + 1).padStart(2, '0')}`,
)
const FORM_OPTIONS: DsOption[] = [
  { value: 'li-xiaoyao', label: '李逍遥', description: 'li-xiaoyao' },
  { value: 'zhao-linger', label: '赵灵儿', description: 'zhao-linger' },
  { value: 'lin-yueru', label: '林月如', description: 'lin-yueru' },
  { value: 'missing', label: '缺失引用', description: 'actor.missing', disabled: true },
]

const MODULE_MENUS: DsMenuDefinition[] = [
  { id: 'file', label: '文件', items: [{ id: 'save', label: '保存', shortcut: '⌘S' }] },
  { id: 'edit', label: '编辑', items: [{ id: 'undo', label: '撤销', shortcut: '⌘Z' }] },
  {
    id: 'scene',
    label: '场景',
    visibility: 'wide-medium',
    items: [{ id: 'scene-workspace', label: '场景工作台', href: '?module=scene' }],
  },
  {
    id: 'map',
    label: '地图',
    visibility: 'wide-medium',
    items: [{ id: 'map-workspace', label: '地图工作台', href: '?module=map' }],
  },
  {
    id: 'story',
    label: '剧情',
    visibility: 'wide-medium',
    items: [{ id: 'story-workspace', label: '剧情工作台', href: '?module=story' }],
  },
  {
    id: 'actor',
    label: '角色',
    visibility: 'wide-medium',
    items: [{ id: 'actor-workspace', label: '角色工作台', href: '?module=actor' }],
  },
  {
    id: 'item',
    label: '物品',
    visibility: 'wide-medium',
    items: [{ id: 'item-workspace', label: '物品工作台', href: '?module=item' }],
  },
  {
    id: 'battle',
    label: '战斗',
    visibility: 'wide-medium',
    items: [
      { id: 'skill', label: '技能', href: '?module=battle&page=skill' },
      { id: 'enemy', label: '敌人', href: '?module=battle&page=enemy' },
      { id: 'poison', label: '毒', href: '?module=battle&page=poison' },
      { id: 'battlefield', label: '战场', href: '?module=battle&page=battlefield', current: true },
    ],
  },
  {
    id: 'asset',
    label: '资源',
    visibility: 'wide-medium',
    items: [{ id: 'asset-workspace', label: '资源工作台', href: '?module=asset' }],
  },
  {
    id: 'project',
    label: '项目设置',
    visibility: 'wide-medium',
    items: [{ id: 'project-settings', label: '项目设置', href: '?module=project' }],
  },
  {
    id: 'navigation',
    label: '导航',
    visibility: 'narrow',
    items: [
      { id: 'nav-scene', label: '场景', href: '?module=scene' },
      { id: 'nav-map', label: '地图', href: '?module=map' },
      { id: 'nav-story', label: '剧情', href: '?module=story' },
      { id: 'nav-actor', label: '角色', href: '?module=actor' },
      { id: 'nav-item', label: '物品', href: '?module=item' },
      { id: 'nav-skill', label: '战斗 / 技能', href: '?module=battle&page=skill' },
      { id: 'nav-enemy', label: '战斗 / 敌人', href: '?module=battle&page=enemy' },
      { id: 'nav-poison', label: '战斗 / 毒', href: '?module=battle&page=poison' },
      { id: 'nav-battlefield', label: '战斗 / 战场', href: '?module=battle&page=battlefield' },
      { id: 'nav-asset', label: '资源', href: '?module=asset' },
      { id: 'nav-project', label: '项目设置', href: '?module=project' },
    ],
  },
]

function fixtureFromLocation(): string | undefined {
  const value = new URLSearchParams(window.location.search).get('fixture') ?? 'RF-01'
  return FIXTURES.includes(value) ? value : undefined
}

function FixtureNav(props: { fixture: string }) {
  return (
    <nav className="lab-fixture-nav" aria-label="Reference fixtures">
      {FIXTURES.map((fixture) => (
        <a
          key={fixture}
          href={`?fixture=${fixture}`}
          aria-current={fixture === props.fixture ? 'page' : undefined}
        >
          {fixture}
        </a>
      ))}
    </nav>
  )
}

function SampleList() {
  return (
    <div className="lab-pane-content">
      <DsListHeader
        title="角色"
        count={6}
        unit="位"
        actions={[{ id: 'create-actor', label: '创建角色', icon: '＋', onClick: () => {} }]}
      />
      {FORM_OPTIONS.slice(0, 3).map((item) => (
        <button type="button" className="lab-object-row" key={item.value}>
          <span>{item.label}</span>
          <code>{item.value}</code>
        </button>
      ))}
    </div>
  )
}

function SampleInspector() {
  return (
    <div className="lab-pane-content">
      <h2>当前摘要</h2>
      <dl className="lab-summary">
        <div>
          <dt>等级</dt>
          <dd>1</dd>
        </div>
        <div>
          <dt>体力 / 真气</dt>
          <dd>150 / 100</dd>
        </div>
        <div>
          <dt>立绘 / 表情</dt>
          <dd>1 / 4</dd>
        </div>
      </dl>
    </div>
  )
}

function FormMatrix() {
  const [actor, setActor] = useState('li-xiaoyao')
  const [many, setMany] = useState<string[]>(['li-xiaoyao', 'lin-yueru'])
  const [radio, setRadio] = useState('normal')
  const [checked, setChecked] = useState(true)
  return (
    <div className="lab-card-grid">
      <DsCard title="输入与选择">
        <div className="lab-form-grid">
          <DsField id="lab-name" label="名称" help="20 个汉字名称仍保持可读。">
            <DsTextInput
              id="lab-name"
              defaultValue="这是一个用于压力测试的二十字中文角色名称示例"
            />
          </DsField>
          <DsField id="lab-level" label="等级" help="范围 1～99。">
            <DsNumberInput id="lab-level" defaultValue={1} min={1} max={99} />
          </DsField>
          <DsField id="lab-select" label="单选 Select">
            <DsSelect
              id="lab-select"
              options={FORM_OPTIONS}
              value={actor}
              onValueChange={setActor}
            />
          </DsField>
          <DsField label="可搜索 Combobox">
            <DsCombobox
              label="角色"
              options={FORM_OPTIONS}
              value={actor}
              onChange={(value) => setActor(value ?? '')}
            />
          </DsField>
          <DsField label="多选 MultiSelect">
            <DsMultiSelect
              label="队伍成员"
              options={FORM_OPTIONS}
              value={many}
              onChange={setMany}
            />
          </DsField>
          <DsField id="lab-description" label="说明" error="示例错误：说明至少需要 10 个字。">
            <DsTextArea id="lab-description" invalid defaultValue="过短" />
          </DsField>
        </div>
      </DsCard>
      <DsCard title="布尔与单选状态">
        <div className="lab-stack">
          <DsCheckbox
            label="普通复选框"
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
          />
          <DsCheckbox label="部分选择" indeterminate />
          <DsCheckbox label="禁用选项" disabled />
          <DsRadioGroup
            name="lab-mode"
            label="模式"
            options={[
              { value: 'normal', label: '普通' },
              { value: 'floating', label: '浮空' },
            ]}
            value={radio}
            onChange={setRadio}
          />
          <DsSwitch
            label="即时预览"
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
          />
        </div>
      </DsCard>
    </div>
  )
}

function ButtonMatrix() {
  return (
    <div className="lab-card-grid">
      <DsCard title="文本动作">
        <p className="lab-card-description">
          颜色只表达语义层级；尺寸、圆角、焦点、禁用和按压反馈由同一底座统一提供。
        </p>
        <div className="lab-button-matrix">
          <DsButton variant="primary">主要动作</DsButton>
          <DsButton variant="secondary">次要动作</DsButton>
          <DsButton variant="quiet">弱动作</DsButton>
          <DsButton variant="danger" icon="delete">
            危险动作
          </DsButton>
          <DsButton disabled>禁用动作</DsButton>
          <DsButton busy>处理中</DsButton>
        </div>
      </DsCard>
      <DsCard title="导航动作">
        <p className="lab-card-description">
          跳转仍使用原生链接语义，但与按钮共享几何和交互状态，不再另造一套 hover。
        </p>
        <div className="lab-button-matrix">
          <DsActionLink href="#button-link" variant="secondary" icon="open">
            打开目标
          </DsActionLink>
          <DsActionLink href="#danger-link" variant="danger" icon="delete">
            危险导航
          </DsActionLink>
        </div>
      </DsCard>
    </div>
  )
}

function MediaMatrix() {
  const backgrounds: DsMediaBackground[] = ['checkerboard', 'plain-dark', 'black', 'grid']
  return (
    <div className="lab-media-grid">
      {backgrounds.map((background) => (
        <DsMediaViewport
          key={background}
          label={`${background} 媒体预览`}
          summary="320 × 200 示例内容"
          background={background}
        >
          <div className="lab-media-sample">{background}</div>
        </DsMediaViewport>
      ))}
    </div>
  )
}

function LargeList(props: { table?: boolean }) {
  const items = useMemo(
    () =>
      Array.from({ length: 600 }, (_, index) => ({
        id: `entry-${index}`,
        label: `对象 ${index + 1}`,
      })),
    [],
  )
  return (
    <DsVirtualList
      label={props.table ? '600 行数据表' : '600 个对象'}
      items={items}
      itemHeight={44}
      height={440}
      getKey={(item) => item.id}
      renderItem={(item, index) => (
        <div className={props.table ? 'lab-table-row' : 'lab-object-row'}>
          <span>{item.label}</span>
          <code>{item.id}</code>
          <span>{index % 3 === 0 ? '已配置' : '待处理'}</span>
        </div>
      )}
    />
  )
}

function HeaderFixture() {
  const [count, setCount] = useState(0)
  const commands: DsToolbarCommand[][] = [
    [
      {
        id: 'undo',
        label: '撤销',
        icon: 'undo',
        shortcut: '⌘Z',
        execute: () => setCount((value) => value + 1),
      },
      {
        id: 'redo',
        label: '重做',
        icon: 'redo',
        shortcut: '⇧⌘Z',
        disabled: true,
        disabledReason: '没有可重做的操作',
        execute: () => {},
      },
      {
        id: 'save',
        label: '保存',
        icon: 'save',
        shortcut: '⌘S',
        execute: () => setCount((value) => value + 1),
      },
    ],
    [
      {
        id: 'copy',
        label: '复制对象',
        icon: 'copy',
        execute: () => setCount((value) => value + 1),
      },
      {
        id: 'delete',
        label: '删除对象',
        icon: 'delete',
        execute: () => setCount((value) => value + 1),
      },
    ],
  ]
  return (
    <div className="lab-shell-header">
      <DsMenuBar label="编辑器主菜单" menus={MODULE_MENUS} />
      <DsToolbar
        label="快捷工具栏"
        groups={commands}
        trailing={<span role="status">执行 {count} 次</span>}
      />
    </div>
  )
}

function ShellFixture(props: { kind: 'object' | 'media' | 'script' | 'table' }) {
  const [tab, setTab] = useState('overview')
  const main = (
    <div className="lab-main-content">
      <DsTabs
        label="编辑分区"
        items={[
          { id: 'overview', label: '总览' },
          { id: 'growth', label: '战斗与成长' },
          { id: 'appearance', label: '外观资源' },
        ]}
        activeId={tab}
        onChange={setTab}
      />
      <DsCard title="主任务区域">
        <p>中央主工作区使用最深的 canvas；普通卡片只使用 panel + subtle border。</p>
      </DsCard>
      {props.kind === 'media' ? <MediaMatrix /> : null}
      {props.kind === 'table' ? <LargeList table /> : null}
    </div>
  )
  return (
    <DsWorkbench
      kind={props.kind}
      label={`${props.kind} workbench`}
      list={<SampleList />}
      main={main}
      inspector={<SampleInspector />}
    />
  )
}

function OverlayFixture() {
  const [dialog, setDialog] = useState(false)
  const [drawer, setDrawer] = useState(false)
  return (
    <div className="lab-main-content">
      <div className="lab-actions">
        <DsButton onClick={() => setDialog(true)}>打开对话框</DsButton>
        <DsButton onClick={() => setDrawer(true)}>打开 Inspector</DsButton>
      </div>
      <DsDialog
        open={dialog}
        title="删除战场"
        description="该对象有 2 处引用，删除默认被阻断。"
        onClose={() => setDialog(false)}
        footer={<DsButton onClick={() => setDialog(false)}>返回引用列表</DsButton>}
      >
        <DsStatus tone="error">无法删除：请先处理引用。</DsStatus>
      </DsDialog>
      <DsDrawer open={drawer} title="Inspector" onClose={() => setDrawer(false)}>
        <FormMatrix />
      </DsDrawer>
    </div>
  )
}

function FixtureBody(props: { fixture: string }) {
  switch (props.fixture) {
    case 'RF-01':
      return <ShellFixture kind="object" />
    case 'RF-02':
      return <ShellFixture kind="object" />
    case 'RF-03':
      return <ShellFixture kind="object" />
    case 'RF-04':
      return <ShellFixture kind="object" />
    case 'RF-05':
      return <ShellFixture kind="media" />
    case 'RF-06':
      return <FormMatrix />
    case 'RF-07':
      return (
        <div className="lab-card-grid">
          <DsEmptyState
            title="没有对象"
            description="创建第一个对象以开始编辑。"
            action={<DsButton variant="primary">创建对象</DsButton>}
          />
          <DsStatus tone="warning">过滤后无匹配项。清除过滤可恢复全部 52 项。</DsStatus>
          <DsStatus tone="error">资源加载失败：asset.missing。可重试或替换资源。</DsStatus>
        </div>
      )
    case 'RF-08':
      return <ButtonMatrix />
    case 'RF-09':
      return <MediaMatrix />
    case 'RF-10':
      return <LargeList />
    case 'RF-11':
      return <ShellFixture kind="script" />
    case 'RF-12':
      return <ShellFixture kind="table" />
    case 'RF-13':
      return <OverlayFixture />
    case 'RF-14':
      return <FormMatrix />
    case 'RF-15':
      return (
        <>
          <HeaderFixture />
          <ShellFixture kind="object" />
        </>
      )
    default:
      return null
  }
}

export function DesignLab() {
  const fixture = fixtureFromLocation()
  if (!fixture) {
    return (
      <main className="lab-error">
        <DsStatus tone="error" action={<a href="?fixture=RF-01">返回 RF-01</a>}>
          未知 fixture。请使用 RF-01～RF-15。
        </DsStatus>
      </main>
    )
  }
  return (
    <div className="lab-app">
      <header className="lab-header">
        <div>
          <strong>Type-Pal Design Lab</strong>
          <span>v{EDITOR_DESIGN_SYSTEM_VERSION}</span>
        </div>
        <FixtureNav fixture={fixture} />
      </header>
      <main className="lab-stage" data-fixture={fixture}>
        <FixtureBody fixture={fixture} />
      </main>
    </div>
  )
}
