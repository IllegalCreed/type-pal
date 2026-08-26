import { useMemo, useState } from 'react'
import {
  DsActionLink,
  DsButton,
  DsCard,
  DsCheckbox,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsDialog,
  DsDrawer,
  DsEmptyState,
  DsField,
  DsFieldMeasure,
  DsInlineComposer,
  DsListHeader,
  type DsMediaBackground,
  DsMediaViewport,
  DsMenuBar,
  type DsMenuDefinition,
  DsMultiSelect,
  DsNumberInput,
  type DsOption,
  DsRadioGroup,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsSelectField,
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
  { length: 17 },
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
        actions={[{ id: 'create-actor', label: '创建角色', icon: 'add', onClick: () => {} }]}
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
          <DsField label="可搜索 Select">
            <DsSelect
              aria-label="角色"
              options={FORM_OPTIONS}
              value={actor}
              searchable
              onValueChange={setActor}
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
      <DsCard title="同行密度与短数值">
        <p className="lab-card-description">
          Composer 由父级统一选择尺寸档；短数值字段保持有界，只有窄容器才让动作换到下一行。
        </p>
        <div className="lab-stack">
          <DsInlineComposer
            density="default"
            control={
              <DsSelectField
                label="默认密度"
                aria-label="默认密度角色"
                options={FORM_OPTIONS}
                value="li-xiaoyao"
                onValueChange={() => {}}
              />
            }
            action={<DsButton icon="add">加入队伍</DsButton>}
          />
          <DsInlineComposer
            density="compact"
            control={
              <DsSelectField
                label="紧凑密度"
                aria-label="紧凑密度角色"
                options={FORM_OPTIONS}
                value="zhao-linger"
                onValueChange={() => {}}
              />
            }
            action={<DsButton icon="add">加入队伍</DsButton>}
          />
          <DsFieldMeasure measure="short-number">
            <DsField id="lab-current-hp" label="当前 HP">
              <DsNumberInput id="lab-current-hp" defaultValue={150} min={0} />
            </DsField>
          </DsFieldMeasure>
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

function ReferenceFixture() {
  const longPath = `scenes[12].${'entities[7].pages[3].trigger.stages[0].body[4].'.repeat(2)}itemId`
  return (
    <div className="lab-reference-grid">
      <DsCard title="Simple · blocking">
        <DsReferencePanel
          state="ready"
          count={{ kind: 'exact', value: 2 }}
          impact={{ kind: 'blocking', description: '解除敌队槽位引用后才能删除敌人。' }}
        >
          <DsReferenceList>
            <DsReferenceRow
              title="敌队 team-0"
              detail="敌队槽位 1"
              path="enemyTeams[0](team-0).slots[0]"
              labels={[{ label: '敌队' }]}
              action={{ label: '打开 ↗', onActivate: () => {} }}
            />
            <DsReferenceRow
              title="敌队 team-0"
              detail="敌队槽位 2"
              path="enemyTeams[0](team-0).slots[1]"
              labels={[{ label: '敌队' }]}
              action={{ label: '打开 ↗', onActivate: () => {} }}
            />
          </DsReferenceList>
        </DsReferencePanel>
      </DsCard>
      <DsCard title="Grouped · occurrences">
        <DsReferencePanel
          state="ready"
          count={{ kind: 'exact', value: 6 }}
          impact={{ kind: 'blocking', description: '按来源分组，组计数与总 occurrence 加和一致。' }}
        >
          <DsReferenceGroup title="场景" count={4}>
            <DsReferenceList>
              <DsReferenceRow
                title="场景 s151"
                detail="获得物品"
                path="scenes[151].hooks.onEnter"
                occurrenceCount={4}
                labels={[{ label: '获得' }]}
                action={{ label: '打开 ↗', onActivate: () => {} }}
              />
            </DsReferenceList>
          </DsReferenceGroup>
          <DsReferenceGroup title="商店" count={2}>
            <DsReferenceList>
              <DsReferenceRow
                title="商店 #7"
                detail="货架配置"
                path="shops[7].stock"
                occurrenceCount={2}
                action={{ label: '打开 ↗', onActivate: () => {} }}
              />
            </DsReferenceList>
          </DsReferenceGroup>
        </DsReferencePanel>
      </DsCard>
      <DsCard title="Static · long content">
        <DsReferencePanel
          state="ready"
          count={{ kind: 'exact', value: 1 }}
          impact={{ kind: 'informational', description: '静态来源不会伪装成 disabled button。' }}
        >
          <DsReferenceList>
            <DsReferenceRow
              title="一段超过二十个汉字的只读兼容引用对象名称用于检验省略与完整值可达"
              detail="本处调用 3 次；当前资源页没有可编辑的精确落点。"
              path={longPath}
              occurrenceCount={3}
              labels={[{ label: '只读兼容来源' }]}
              status={{ label: '只读', reason: '没有可编辑的精确位置。' }}
            />
          </DsReferenceList>
        </DsReferencePanel>
      </DsCard>
      <DsCard title="Loading">
        <DsReferencePanel
          state="loading"
          count={{ kind: 'at-least', value: 3 }}
          impact={{ kind: 'blocking', description: '正在扫描 8/24 张地图；危险动作保持禁用。' }}
        />
      </DsCard>
      <DsCard title="Partial / error">
        <DsReferencePanel
          state="partial"
          count={{ kind: 'at-least', value: 5 }}
          impact={{ kind: 'blocking', description: '2 张地图读取失败；当前结果只是下界。' }}
          action={<DsButton size="compact">重试扫描</DsButton>}
        />
        <DsReferencePanel
          state="error"
          count={{ kind: 'unknown' }}
          impact={{ kind: 'blocking', description: '无法读取引用索引，请修复错误后重试。' }}
        />
      </DsCard>
    </div>
  )
}

function DiagnosticFixture() {
  const projectIssues = Array.from({ length: 152 }, (_, index) => ({
    id: `project-${index + 1}`,
    ordinal: index + 1,
  })).map(({ id, ordinal }) => (
    <DsDiagnosticRow
      key={id}
      severity={ordinal % 5 === 1 ? 'error' : 'warning'}
      title={`项目问题 ${ordinal}`}
      code={ordinal % 5 === 1 ? 'missing-asset' : 'unused-asset'}
      path={`manifest.${'assets.roles.'.repeat(ordinal === 1 ? 10 : 1)}entry-${ordinal - 1}`}
      action={ordinal <= 2 ? { label: '跳转 ↗', onActivate: () => {} } : undefined}
      statusLabel={ordinal % 3 === 1 ? '无法定位' : '仅提示'}
    />
  ))
  return (
    <div className="lab-reference-grid">
      <DsCard title="Project · 152 mixed">
        <DsDiagnosticPanel
          state="ready"
          count={{ kind: 'exact', errors: 31, warnings: 121 }}
          description="保持 30 条紧凑摘要、80 条完整分页与精确总数。"
          live={false}
        >
          <DsDiagnosticList initialVisibleCount={30} pageSize={80}>
            {projectIssues}
          </DsDiagnosticList>
        </DsDiagnosticPanel>
      </DsCard>
      <DsCard title="Static · long content">
        <DsDiagnosticPanel state="ready" count={{ kind: 'exact', errors: 1, warnings: 1 }}>
          <DsDiagnosticList>
            <DsDiagnosticRow
              severity="error"
              title="一段超过二十个汉字的诊断消息用于验证标题、代码、证据和路径都能完整换行"
              code="asset-kind-mismatch"
              detail="期望 portrait，实际为 battle-background。"
              path={`assets["portrait.pal.001"].${'nested.evidence.'.repeat(8)}kind`}
              statusLabel="无法定位"
            />
            <DsDiagnosticRow
              severity="warning"
              title="迁移来源需要人工核对"
              code="migration-pending"
              path="L_99 · 0x63"
              action={{ label: '在问题面板查看 ↗', href: '?module=project&page=advanced' }}
            />
          </DsDiagnosticList>
        </DsDiagnosticPanel>
      </DsCard>
      <DsCard title="Clear">
        <DsDiagnosticPanel
          state="clear"
          count={{ kind: 'exact', errors: 0, warnings: 0 }}
          summary="资源类型与引用闭包正常"
        />
      </DsCard>
      <DsCard title="Partial / failure">
        <DsDiagnosticPanel
          state="partial"
          count={{ kind: 'at-least', errors: 2, warnings: 4 }}
          description="2 个来源读取失败；当前计数只是下界。"
          action={<DsButton size="compact">重试检查</DsButton>}
        />
        <DsDiagnosticPanel
          state="failure"
          count={{ kind: 'unknown' }}
          description="无法读取诊断索引；修复来源后重试。"
          action={<DsButton size="compact">重试检查</DsButton>}
        />
      </DsCard>
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
    case 'RF-16':
      return <ReferenceFixture />
    case 'RF-17':
      return <DiagnosticFixture />
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
          未知 fixture。请使用 RF-01～RF-17。
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
