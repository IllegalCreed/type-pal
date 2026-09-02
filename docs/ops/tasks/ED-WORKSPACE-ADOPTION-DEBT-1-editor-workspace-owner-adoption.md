# ED-WORKSPACE-ADOPTION-DEBT-1 - 编辑器旧工作区滚动壳真实采用清零

Status: review
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`
Design-System Version: `2.24.0`（纯采用清债，不改公共合同，不升版）

## 目标

清零六个既存业务文件对 raw `ds-object-workspace*` class 的借用，使中央主工作区与滚动内容改为真实
`DsObjectWorkspace`，并删除 ED-CATALOG-ROW-IA-1 为冻结旧债建立的精确 exception。完成前，静态门禁必须
锁死当前文件、selector 与出现次数，任何新增 raw 用法立即失败。

## 范围

- 范围内：
  - `ProjectWorkbenchTab.tsx`
  - `BattleSpriteLibrary.tsx`
  - `VarsTab.tsx`
  - `SpriteResourceViewer.tsx`
  - `EnemyTeamTab.tsx`
  - `BattleFieldTab.tsx`
  - 对应 route-live adoption owner、DOM/CSS 唯一滚动 owner、聚焦测试与功能性浏览器验证。
- 范围外：
  - 不改 catalog 行信息层级、字段布局、draft/commit、schema、migration、runtime 或项目内容。
  - 不把 `DsVirtualList`、Canvas / Isometric surface、Inspector 滚动误塞进中央对象工作区。
  - 不重开 ED-DS-3 或 ED-CATALOG-ROW-IA-1；本卡只消费后者登记的清零条件。

## 用户裁决

- 2026-09-02 用户明确“做吧”，批准继续本卡。
- 用户可见 `before -> after`：六个既有中央工作区的页面名称、Hero、字段、按钮、滚动位置与业务行为保持
  不变；只把“借公共 class 的假 owner”替换为真实公共组件与可机检 data marker。
- 本卡按一张卡、两批实现：第一批 Project / BattleSprite / SpriteViewer；第二批 Vars / EnemyTeam /
  BattleField。分批只服务验证，不重复开卡或改变签字范围。

## 前提真值门

### 一句话行为 / 工程前提

六个文件当前只借用了设计系统保留 class，没有渲染真实 `DsObjectWorkspace`，却可能被 adoption 文案误记为
已采用；替换必须保持每页唯一纵向 owner、固定 Hero 和既有用户行为不变。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段编辑器工作区。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有 Reforge 编辑器设计系统。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 六文件共有 22 个 raw `ds-object-workspace*` occurrence；registry 为 27 pages（19 adopted / 8 exception）、6 legacy entries / 12 selector records / 9 registry pairs，并以现有门禁冻结。运行态各分支仍只有一个中央 y owner。 | `ProjectWorkbenchTab.tsx:309-317`；`BattleSpriteLibrary.tsx:1128-1177`；`VarsTab.tsx:360-491`；`SpriteResourceViewer.tsx:450-535`；`EnemyTeamTab.tsx:365-514`；`BattleFieldTab.tsx:278-424`；`design-system-adoption.json` |
| 本任务目标 | 六文件各只渲染 1 个真实 `DsObjectWorkspace` + 1 个 canonical content owner；27 pages 全 adopted，legacy 全归零，102 条 scroll records 总数不变，9 条 legacy main record 原位换成 `DsObjectWorkspaceContent`。 | `recipes.tsx:132-178` 现有 wrapped API；本卡设计与验收条件 |

### 反证与替代解释

- 最强替代解释：class 已复用公共 CSS，视觉相同，无需真实组件。
- 反证：class 借用不提供公共 data marker、语义和 API 边界，registry 曾因此把 prose/类名误报成真实采用。
- 可证伪观察：若改造导致 Hero 跟随内容滚动、出现第二纵向 owner、创建/空/加载分支高度塌陷，或路由真值门禁
  仍可被 raw class 欺骗，则方案失败并转 blocked/rework。
- 最强实现替代解释：多分支页必须使用 `contentMode="manual"` 并手写多个 content owner。不成立：现有
  `hero: ReactNode` 可用无 DOM fragment 同时承载 notice + selected Hero，children 内切换业务正文；默认 wrapped
  mode 始终只生成一个 canonical content callsite，边界更强且无需扩 API。

## 上下文锚点

- `AGENTS.md` 的推进签字、单 Coding Owner 与前提真值门。
- `docs/phase2/READ-FIRST.md`。
- `docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md:308-372`。
- `packages/editor/src/ui/design-system/recipes.tsx`（`DsObjectWorkspace`）。
- 六文件当前 raw class callsite 与 `packages/editor/src/ui/editor.css` 对应滚动 owner。
- `design-system-adoption.json` 当前 27 pages / 102 scroll records / 6 legacy exceptions；
  `adoption.test.ts` 与 `design-system-audit.mjs` 的 route-live、reserved marker 与 nested-owner 反例。
- 不得重新引入：页面伪造 `ds-object-workspace*` / `data-ds-scroll-*`、嵌套同轴滚动、无证据 allowlist。

## 验收条件

- 六文件生产 TSX 的 22 个 raw `ds-object-workspace*` occurrence 精确归零；每文件恰一个真实
  `DsObjectWorkspace`，每个运行态恰一个 direct `data-ds-scroll-owner="main"` / axis y。
- Hero / notice 固定，内部 content 是中央主区唯一 y-scroll owner；目录、主区、Inspector 各自边界清晰。
- creating / selected / empty / loading / error 分支均不重复创建 content owner。
- registry 从 19 adopted / 8 exception 变为 27 / 0；legacy 6 entries / 12 selectors / 22 occurrences /
  9 pairs 全归零；102 scroll records 总数不变，canonical `DsObjectWorkspaceContent` record 从 11 增至 20。
- 删除六文件 legacy exception；raw literal/拼接/spread/dynamic class 回流、真组件退回 raw、重复 content owner、
  漏登 9 条 main owner、stale legacy 与 `status:exception` 回流均必须红。
- `recipes.tsx/css`、`design-system-audit.mjs`、index/tokens、DS 版本与 Design Lab/RF 零 diff；若实现需要新增
  notice/branch 等公共 prop，立即停线更新前提并重新三签。
- Project 四 route + repair、BattleSprite upload/ready/empty、SpriteViewer loading/error/ready、Vars/EnemyTeam/
  BattleField creating/selected/empty（含引用/preview loading/error）均有 DOM owner 与焦点回退覆盖。
- 聚焦 DOM/CSS 测试、editor typecheck、受影响包全量测试和最小浏览器矩阵通过。
- 浏览器覆盖 1280×800、900×720、720×700 与高 480：Hero/notice rect 固定，content 可滚到底，root/祖先
  scrollTop=0，document 横溢=0，focus 只滚中央 content；catalog/Inspector 与有界 `.bsu-frame-grid` 独立。

## 推进签字

### 进入 build 前：设计签字

- Codex:
  - premise: **verified（2026-09-02）**——直读六文件 22 个 raw callsite、互斥分支和 CSS；独立复算
    registry 27 pages（19/8）、102 scroll records、6/12/22/9 legacy 基线。当前每个运行态只有一个中央
    y owner，但 class 借用缺公共 marker/API 边界，前提成立。
  - design: **agree（2026-09-02）**——六文件统一使用现有 wrapped `DsObjectWorkspace`；Project helper 一处
    覆盖四 route，BattleSprite 一处覆盖三分支，SpriteViewer 收敛三次 early return；复杂三页以 hero fragment
    固定 notice/selected Hero、children ternary 切正文。公共 API/DS 版本零变；两批实现与 registry/测试/视觉
    矩阵闭合。可推翻观察为 Hero/notice 滚动、重复 owner、focus 掉 body 或 route-live 无法追到 helper。
- Kimi:
  - premise: **verified（2026-09-02，本人复算 registry 与逐文件直读六处 callsite/分支，非复述
    Codex）**：
    1. **census 本人复算（design-system-adoption.json 直读）**:27 pages = 19 adopted +
       **8 exception**——正好映射六文件：Project 四 route（overview/startup/entrypoint/advanced）
       + asset/sprite + story/vars + battle/enemy-team + battle/battlefield;scroll records 总数
       **102**;`workspaceLegacyExceptions` 恰 **6 entries / 12 selectors / 22 occurrences**
       （Project 1+1、BattleSprite 1+1、Vars 1+3、SpriteViewer 3+3、EnemyTeam 1+3、BattleField
       1+3);canonical `DsObjectWorkspaceContent` records 现 **11**——目标 27+0、legacy 全 0、
       9 条 main legacy records 原位换 owner 后 11+9=**20**,算术逐字一致。
    2. **六文件结构逐一直读**:
       - ProjectWorkbenchTab.tsx:300-320 的 `ProjectPageWorkspace` helper——单一
         `<main.ds-object-workspace>` + 单 Hero + `.project-scroll` content,**一处覆盖四 route**;
       - BattleSpriteLibrary.tsx:1128-1177——单 Hero(uploading 条件 props)+ content ternary,
         `.bsu-frame-grid` 为既有 bounded subviewport 登记,非第二 main owner;
       - SpriteResourceViewer.tsx:448-469,532-535——error/loading/ready **三次 early return**
         各自重复 shell(root×3 + content×3),可收敛为一处 workspace + ternary;
       - VarsTab.tsx:360-408、EnemyTeamTab.tsx:365-427、BattleFieldTab.tsx:278-338——同型:
         notice(role=alert 固定于 main 顶部) + creating content vs selected(单 Hero + content),
         恰好匹配 `hero={<>{notice}{selected && Hero}</>}` + children ternary。
    3. **wrapped API 充足性实锤**:recipes.tsx:130-178 的 `DsObjectWorkspace` 现有
       `as/label/hero/children/className/contentClassName/contentMode` 已够——hero 是
       ReactNode,fragment 可同时承载 notice 与 selected Hero 且**不新增 DOM 层**;
       wrapped mode 恒生成一个带 `data-ds-scroll-owner="main"` / `data-ds-scroll-axis="y"`
       的 canonical content——六文件每个运行态都只有一个 content div,**无一需要 manual mode**;
       公共 API/DS 版本零变成立。
    4. **风险点直读**:EnemyTeam content 内含 DsReorderCollection(:432-438)——迁后最近滚动
       owner 仍是 canonical content,语义不变;SpriteViewer asset 切换走 props 变化不重建
       workspace(收敛后单 callsite);Project 若用 scrollIntoView,目标仍在 canonical content 内。
    5. **可推翻观察**:任一分支迁后出现第二个 y owner;notice/Hero 进入可滚层;分支切换焦点
       掉 body;route-live 门禁追不到 Project helper;registry 复算不等于 27+0 / 102 / 0 / 20——
       任一本签字失效。
  - design: **agree（2026-09-02，附 KW1-KW5 必落钉）**：
    - **KW1（统一 wrapped 钉）**:六文件一律使用现有 `DsObjectWorkspace` wrapped mode;
      **禁止 manual mode 与手写 `DsObjectWorkspaceContent`**;hero fragment 承载
      notice+selected Hero;children ternary 在 creating/selected/empty/loading/error 间切换
      正文但**永不替换 content owner identity**;DS 保持 2.24.0、公共 API 零变——实现若需要
      任何新增公共 prop(notice/branch 槽位）立即停线回本卡重签,不得顺手放宽。
    - **KW2（census 钉）**:27 pages 19 adopted+8 exception → **27+0**;102 scroll records
      总数不变;legacy **6 entries / 12 selectors / 22 occurrences / 9 main records → 0**;
      canonical `DsObjectWorkspaceContent` records **11 → 20**;recipes.tsx/css、
      design-system-audit.mjs、index/tokens、DS 版本与 Design Lab/RF 零 diff。
    - **KW3（分支与焦点钉）**:每个运行态恰 1 root + 1 个 direct
      `data-ds-scroll-owner="main"` y owner;notice/Hero 固定在 hero 槽不随内容滚动;
      creating→selected、empty→creating、删除→empty 的焦点回退有测试;Project 四 route 与
      repair、BattleSprite upload/ready/empty、SpriteViewer loading/error/ready、
      Vars/EnemyTeam/BattleField 三态（含引用/preview loading/error）均有 DOM owner 断言。
    - **KW4（门禁回流钉）**:raw literal/拼接/spread/dynamic class、真组件退回 raw、重复
      content owner、漏登 9 条 main owner、stale legacy 与 `status:exception` 回流全部必红;
      `.bsu-frame-grid` bounded 继续独立登记、不得被误判为第二 main owner;六文件的
      `.project-scroll`、`.world-variable-scroll`、`.enemy-team-scroll` 等私有 y-overflow
      声明删除,领域 padding/背景/height/container 保留。
    - **KW5（视觉矩阵钉）**:1280×800、900×720、720×700、高 480:Hero/notice rect 固定,
      content 可滚到底,root/祖先 scrollTop=0,document 横溢 0,focus 只滚中央 content;
      catalog/Inspector 与 bounded `.bsu-frame-grid` 各自独立。
- GLM:
  - premise: **verified（2026-09-02，registry 全部数值本人以真实 JSON 结构独立解析复算 + 六文件
    raw census + wrapped API/CSS/门禁锚点直读，非复述 Codex/Kimi；与 Kimi 逐数收敛）**：
    1. **registry 复算（design-system-adoption.json 本人 node 解析）**：pages 恰 **27 = 19
       adopted + 8 exception**；8 个 exception registry 恰为
       `story/vars`、`battle/enemy-team`、`battle/battlefield`、`asset/sprite`、
       `project/overview|startup|entrypoint|advanced`——精确映射六文件（Project helper 一处
       覆盖四 route）；`catalogScrollOwners` 各页 scroll records 总和恰 **102**；canonical
       `DsObjectWorkspaceContent` records 恰 **11**（11+9=**20** 算术自洽）；
       `workspaceLegacyExceptions` 恰 **6 entries / 12 selectors / 22 occurrences**、其中
       main 位 legacy records 恰 **9**——卡面全部基线数值与我的独立解析逐字一致。
    2. **六文件 raw census**：`ds-object-workspace` 字面出现 Project 2 / BattleSprite 2 /
       Vars 4 / SpriteViewer 6 / EnemyTeam 4 / BattleField 4 = **22**，与 legacy occurrences
       计数闭合；六个 legacy entry 的 selector 与 callsite 抽样直读真实（如 Project 的
       `main.canvas-wrap…ds-object-workspace` + `div.project-scroll…__content` 双 selector）。
    3. **wrapped API 充足性直读**：`recipes.tsx` `DsObjectWorkspace` 现有
       `as/label/hero?: ReactNode/className/contentClassName/contentMode`——hero 可持
       fragment（notice + selected Hero）且不新增 DOM 层；wrapped mode 恒生成唯一带
       `data-ds-scroll-owner="main"` / `data-ds-scroll-axis="y"` 的 content——「无一需要
       manual mode 或新公共 prop」成立，DS 2.24.0 零变前提可靠。
    4. **CSS/门禁锚点直读**：`.project-scroll`（:1556）、`.world-variable-scroll`
       （:8309,8324）、`.enemy-team-scroll`（:10886）私有 y-overflow 规则真实存在（删除目标
       实在）；`.bsu-frame-grid` 在 registry 中为 bounded `custom:` owner 非 main（误判防线
       有据）；adoption.test 已有 route-live 证明与 nested-owner 负例族
       （`future-nested-owner` forged-independent 红）——KW4 的回流负例在既有家族上扩展成立。
    5. **可推翻观察**：迁后任一分支出现第二 y owner 或 Hero/notice 进滚层；route-live 追不到
       Project helper 单 callsite；registry 复算 ≠ 27+0 / 102 / 全零 / 20——任一本签字失效。
  - design: **agree（2026-09-02，附 GM-WD1~GM-WD4 必落钉；与 Kimi KW1-KW5 收敛互补）**：
    - **GM-WD1（census 冻结与零 diff 钉，同 KW2）**：终态精确 **27+0 / 102 不变 / legacy
      6-12-22-9 全零 / canonical 11→20**；8 个 exception page 翻转为 adopted 且 owners 文案
      同步去掉 `legacy-exception:` 前缀；`status:exception` 回流必红；recipes.tsx/css、
      design-system-audit.mjs、index/tokens、DS 版本与 Design Lab/RF **零 diff**——若实现
      需要任何新公共 prop 立即停线回卡重签。
    - **GM-WD2（运行态唯一 owner 与分支钉，同 KW3）**：六文件每个运行态恰 1 root + 1 个
      direct `data-ds-scroll-owner="main"` y owner；分支切换（creating/selected/empty/
      loading/error）只换 children 不换 content owner identity；SpriteViewer 三次 early
      return 收敛为单 workspace callsite 后 loading/error 不闪 ready 壳；焦点回退
      （creating→selected、empty→creating、删除→empty）有测试；route-live 证明能追到
      Project helper 单 callsite 覆盖四 route + repair。
    - **GM-WD3（门禁与 CSS 钉，同 KW4）**：负例矩阵——raw literal/拼接/spread/dynamic、
      真组件退回 raw、重复 content owner、**9 条 main owner 漏登任一**、stale legacy 全红；
      `.bsu-frame-grid` bounded 继续独立非 main；私有 y-overflow 声明删除而领域
      padding/背景/height/container 保留（boundary/CSS census 同步）。
    - **GM-WD4（视觉矩阵与诚实口径钉，同 KW5）**：1280×800、900×720、720×700、高 480——
      Hero/notice rect 固定、content 可滚到末项、root/祖先 scrollTop=0、document 横溢 0、
      focus 只滚中央 content、catalog/Inspector/bounded grid 独立；200% 无法可靠触发时保持
      「未实测」口径，不以缩窄视口/pinch 冒充。
- counter / 分歧处理: N/A（GM-WD1~WD4 与 Kimi KW1-KW5 逐项收敛）
- 缺签豁免: N/A
- build 准入结论: **allowed（签字面）（2026-09-02，Codex + Kimi（KW1-KW5）+ GLM
  （GM-WD1~WD4）三方 premise verified + design agree 齐、无 counter；用户「做吧」在案。Codex
  开工时状态转 build，仍为唯一 Coding Owner；按卡面两批实现。）**

### 进入 done 前：审查签字

- Codex: **accept（2026-09-02，实施提交 `39ea04cd`）**——六文件各恰 1 个真实 wrapped
  `DsObjectWorkspace`，生产 raw `ds-object-workspace*` 为 0；Project 一处 helper 覆盖四 route，
  BattleSprite/Vars/EnemyTeam/BattleField 分支只切 children，SpriteViewer 三次 early return 收敛为
  单一 owner。公共 `recipes.tsx/css`、audit、index/tokens、DS 2.24 与 Design Lab/RF 零 diff。
  registry 精确为 27 adopted / 0 exception、102 scroll records、20 canonical main owner、legacy 全零。
  创建分支首输入获得焦点，未改页面样式、字段、命令或数据。
  - 自动验证：红先行 `6 legacy != 0`；受影响 `8 files / 165 tests`；editor 串行全量
    `186 files / 1562 tests`；typecheck、production build、design-system gate
    `92 files / 2 evidence-bound exceptions` 全绿。
  - 浏览器验证：Project 四 route + BattleSprite / WorldSprite / Vars / EnemyTeam / Battlefield，
    1280×800、900×480、720×700；每页 main owner 恰 1、root/祖先 scrollTop=0、Hero y不动、
    长内容末端可聚焦、document横溢0。domain class、padding（24/16，Vars 14）、背景与 root/content
    overflow 保持原合同；三个创建分支焦点均落 INPUT。200% / Firefox / WebKit 未实测，不以缩视口冒充。
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

- 设计结论: **Codex / Kimi / GLM 三方 agree，无 counter**。现有 `as / label / hero / className /
  contentClassName` wrapped API 足够；六文件都不得使用 manual mode 或手写 `DsObjectWorkspaceContent`。
- 第一批：Project helper、BattleSprite、SpriteViewer。三者分别保持四 route、三业务分支、三加载状态的单一
  workspace callsite；SpriteViewer 先把 early return 归一为一处 final workspace。
- 第二批：Vars、EnemyTeam、BattleField。`hero` fragment 承载固定 notice 与仅 selected 时出现的 Hero；
  children 在 creating/selected/empty 间切换，canonical content 永不随分支替换 owner identity。
- CSS：删除 `.project-scroll`、`.world-variable-scroll`、`.enemy-team-scroll` 的私有 y-overflow 声明与明确
  重复的 root flex/grid 属性；保留领域 padding、背景、height、container 和 bounded subviewport。
- 已知风险：分支切换焦点掉 body；Project `scrollIntoView` 错滚祖先；Enemy reorder 最近 owner 漂移；
  BattleSprite upload bounded grid 被误判第二 main owner；SpriteViewer asset 快速切换重建 owner。均先补红测。

## Build: 实现与自测

- Coding Owner: Codex（2026-09-02 开始；唯一实现 owner）
- 修改文件: 六个业务 TSX + 六个业务测试 + `object-workspace-test-utils.ts`；
  `design-system-adoption.json` / `adoption.test.ts` / design-system spec / `editor.css`。
- 实现摘要:
  - 第一批 Project / BattleSprite / SpriteViewer 全部采用默认 wrapped owner；SpriteViewer 的
    loading/error/ready 共用同一 content DOM identity。
  - 第二批 Vars / EnemyTeam / BattleField 以 hero fragment 固定 notice+selected Hero，children ternary
    切 creating/selected/empty；三个创建分支首输入 `autoFocus`，避免旧按钮卸载后焦点掉 body。
  - 删除重复 domain overflow/flex 声明；保留全部 domain class、padding、背景、height、container 与
    `.bsu-frame-grid` bounded subviewport，样式零变化。
  - adoption 从 19/8 翻为27/0，6 entries / 12 selectors / 22 occurrences / 9 pairs 清零，
    canonical owner 11→20；raw/动态/重复/stale 回流负例保留并增强。
- 测试结果: 见 Codex done 前 accept；实现提交 `39ea04cd`。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 已批准开工方向；最终功能验收 pending
- 后续任务: N/A

## 交接日志

- 2026-09-02 Codex：完成两批实现并提交 `39ea04cd`。六文件22 raw与legacy全清，27 pages全adopted，
  公共API/DS版本零变；受影响165项、全量1562项、typecheck/build/gate与三档九route浏览器矩阵通过。
  Codex签accept，卡转review。Next：Kimi只读终审；不得标done。
- 2026-09-02 User + Codex：用户再次确认本卡“只是统一组件，理论上样式不会变”，Codex明确将
  **样式与交互零可见变化**作为硬验收条件；随后用户“签了”。Kimi/GLM设计签字提交已推送，三签齐、
  无 counter，卡转 build。Codex按两批连续实现；无下一位 Agent 提示词。
- 2026-09-02 GLM: 设计审签。独立以真实 JSON 结构解析复算全部基线——27 pages（19+8，exception
  registry 精确映射六文件）、scroll records 总和 102、canonical DsObjectWorkspaceContent 11
  （+9 main legacy = 20）、legacy 6/12/22；六文件 raw 字面 22 处 grep 闭合；wrapped API
  （hero ReactNode fragment + 唯一 main/y content marker）充足性、私有 y-overflow CSS 目标、
  `.bsu-frame-grid` bounded 登记、既有 route-live/nested 负例族直读。签 premise verified +
  design agree，附 GM-WD1（census 冻结 + exception 翻转 + 公共层零 diff）/GM-WD2（运行态唯一
  owner + 分支不换 identity + SpriteViewer 不闪 ready 壳 + route-live 追 helper）/GM-WD3
  （回流负例矩阵含 9 条 main 漏登 + CSS 删留边界）/GM-WD4（四档视觉矩阵 + 200% 未实测口径）。
  未修改实现，未代签 Kimi。三签齐 + 用户「做吧」在案，build 准入（签字面）allowed。
  Next: Codex 按两批实现。
- 2026-09-02 Kimi: 独立复算 registry(27 pages=19+8 exception 恰映射六文件四 route+四面、
  102 scroll records、legacy 6/12/22、canonical content 11)并逐文件直读六处结构（Project
  helper 一处四 route、BattleSprite 单 Hero ternary、SpriteViewer 三次 early return 可收敛、
  Vars/EnemyTeam/BattleField 同型 notice+creating/selected)。压测确认现有 wrapped API 充足、
  无一需要 manual mode 或新公共 prop。签 premise verified + design agree(KW1 统一 wrapped
  禁 manual / KW2 census 27+0·102·0·20 / KW3 分支与焦点 / KW4 门禁回流 / KW5 视觉矩阵),
  完成独立反证。未修改实现,未代签 GLM。Next: GLM 复算 census/测试矩阵后三签齐,Codex 方可
  build。
- 2026-09-02 User + Codex：用户明确“做吧”。Codex 完成六文件/22 occurrence、互斥分支、CSS 与 registry
  一手审计，确认现有 wrapped API 足够且公共 API / DS 版本零变，签 premise verified + design agree。
  卡仍为 draft/build blocked。Next：Kimi 独立设计审查；不得实现。
- 2026-08-28 Codex：按 ED-CATALOG build-time scope 补签条件建卡并上看板；当前只冻结 6 文件旧债，未修改
  本卡实现。Next：完成四向真值与逐文件设计后送 Codex / Kimi / GLM build 前签字；三签齐前不得实现。

## 下一位 Agent 提示词

```text
终审 ED-WORKSPACE-ADOPTION-DEBT-1（Kimi 席，review；生产实现只读，只允许更新任务卡 Kimi done
前签字与交接，不得代签 GLM，不得标 done）。

任务卡：docs/ops/tasks/ED-WORKSPACE-ADOPTION-DEBT-1-editor-workspace-owner-adoption.md
实现提交：39ea04cd refactor(editor): adopt canonical object workspaces

先读：AGENTS.md、READ-FIRST、本卡 KW1-KW5 / GM-WD1~WD4 与 Build/Codex accept；git show
39ea04cd；六业务 TSX/测试、object-workspace-test-utils、design-system-adoption.json、adoption.test、
editor.css、DS-C.4f。

Kimi职责：
1. 独立复算终态 27 adopted/0 exception、102 scroll records、20 canonical、legacy 0；六生产文件
   raw occurrence 0 且各恰1个 DsObjectWorkspace；公共 recipes/audit/index/tokens/DS版本/RF零diff。
2. 审 wrapped 结构与样式零变化：Project四route；BattleSprite upload/ready/empty；SpriteViewer
   loading/error/ready；Vars/EnemyTeam/BattleField creating/selected/empty。Hero/notice在content外，
   domain class/padding/background/height/container保留，私有重复overflow删除不改computed style。
3. 审焦点与滚动：每态1 direct main/y owner；创建首INPUT；Enemy reorder最近owner；Project
   scrollIntoView；Sprite快速切资源；bounded bsu grid不冒充main。
4. 审门禁负例：raw literal/拼接/spread/dynamic、真组件退raw、重复owner、漏9条main记录、stale
   legacy/status exception回流均红。
5. 复核证据：受影响8/165、全量186/1562、typecheck/build/gate92/2；浏览器1280×800、
   900×480、720×700，root/ancestor 0、Hero固定、末项可达、doc横溢0。200%/Firefox/WebKit
   无可靠环境时保持未实测。

输出：file:line直接证据；通过则任务卡 Kimi 席签 accept并写GLM提示词，否则 counter/返工项。
不得修改生产实现，不得标done。
```

## 历史提示词（GLM 设计审签，已完成）

```text
审签 ED-WORKSPACE-ADOPTION-DEBT-1（GLM 席，draft；生产实现只读，只允许更新任务卡签字/交接；
不得代签，不得标 build/done）。

任务卡：docs/ops/tasks/ED-WORKSPACE-ADOPTION-DEBT-1-editor-workspace-owner-adoption.md
当前：用户“做吧”与 Codex + Kimi（KW1-KW5）已签；你的 GLM premise/design pending。
三签齐前不得实现。

先读：AGENTS.md、READ-FIRST、本卡全文（含 Kimi 签节与 census 复算）、
ED-CATALOG-ROW-IA-1 卡 :308-380,:1320-1380、recipes.tsx:130-178、
design-system-adoption.json、adoption.test.ts。

你的分工（独立证据，不复述 Codex/Kimi）：
1. 复算 registry 迁移前后数值：27 pages 19 adopted+8 exception → 27+0；
   102 scroll records 总数不变；workspaceLegacyExceptions 6 entries / 12 selectors /
   22 occurrences / 9 main records → 0；canonical DsObjectWorkspaceContent records 11→20；
   8 个 exception page（Project 四 route + asset/sprite + story/vars + battle/enemy-team +
   battle/battlefield）状态翻转与 owner 文案同步；status:exception 回流必红。
2. 测试矩阵：六文件每运行态恰 1 root + 1 direct data-ds-scroll-owner="main" y owner；
   Hero/notice 固定不滚；creating/selected/empty/loading/error 分支焦点回退；Project 四
   route + repair、BattleSprite upload/ready/empty、SpriteViewer loading/error/ready、
   Vars/EnemyTeam/BattleField 三态；raw literal/拼接/spread/dynamic class、真组件退回 raw、
   重复 content owner、漏登 9 条 main owner、stale legacy 全部必红；`.bsu-frame-grid`
   bounded 不误判第二 main owner；route-live 能追到 Project helper。
3. CSS 复核：`.project-scroll`、`.world-variable-scroll`、`.enemy-team-scroll` 等私有
   y-overflow 与重复 root flex/grid 声明删除；领域 padding/背景/height/container 保留；
   无嵌套同轴滚动。
4. 视觉矩阵复核：1280×800、900×720、720×700、高 480 的 Hero/notice rect 固定、末项可达、
   root/祖先 scrollTop=0、横溢 0、catalog/main/Inspector 独立；200% 无法可靠触发时保持
   “未实测”口径。
输出：GLM 席 premise verified + design agree，或 counter + file:line/反例。
```
