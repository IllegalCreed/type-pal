# GAME-MOBILE-LAYOUT-1 - 第一阶段移动端与标准手柄支持

Status: review
Phase: phase1
Capability: mobile presentation / touch / gamepad input
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（作者自验与独立验收分开记录）
Visual Verification Owner: Codex / User
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: codex/game-mobile-layout

## 目标

按用户 2026-10-22「大改试一下移动端按照你的方案布局能不能放得下」的授权，做可运行的横竖屏布局，
用真实画面与触控操作检验小屏可玩性，供用户看效果。关联 [issue #7](https://github.com/IllegalCreed/type-pal/issues/7)。

## 范围

- 范围内：游戏外壳、保持比例的画面、六个基础虚拟按键及显示开关、标准手柄输入、移动工具抽屉、半透明小地图、必要测试。
- 范围外：二阶段编辑器、游戏机制/帧缓冲/地图数据/存档格式、部署发布。
- 从可运行试验推进至用户认可的软件交付；不把浏览器尺寸模拟写成手机实机或手柄验收。

## 前提真值门

### 一句话行为 / 工程前提

基点的固定桌面画布不能适配手机窗口；本轮按用户迭代采用窗口定位的半透明触控层。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 此项为浏览器新增交互，无原版手机布局真值；玩法输入沿用现有抽象键 | packages/shared/src/input.ts:1；用户本轮授权 |
| 第一阶段 | 画布默认960×600、fixed居中；全屏仅canvas；输入只有键盘 | packages/game/src/tools/display-scale.ts:28；packages/game/src/shell/input.ts:91 |
| 当前二阶段 | N/A（本任务只涉及第一阶段game） | packages/game/src/main.ts:1 |
| 本任务目标 | 画面按8:5最大适配；按键固定手机窗口四角、半透明叠加；小地图左上叠加，不规避 | 用户本轮请求及同会话已讨论方案 |

### 反证与替代解释

- 最强替代解释：仅缩小现有canvas即可；但既有fixed布局不会留住窗口定位的触控层和手机工具裁剪。
- 推翻条件：真实小屏布局仍出现裁切、按键越界、画面变形或无法完成标题/菜单操作，应返工布局。
- runtime/原版/提取数据：不改游戏移动语义、键位含义、资源或脚本；本次新增触摸输入只产生现有AbstractKey。
- test model：DOM模拟只证明布局和事件合同，不证明真机多指、浏览器安全区或硬件手柄。

### 用户可见偏离

- 是否主动偏离已核真值：N/A（浏览器移动布局新增能力）。
- before → after：手机只能看桌面画面 → 手机可用窗口固定的六键半透明触控层，按需展开工具。
- 代表场景：375×667竖屏、667×375横屏，开工具后可滚动并返回游戏。
- 用户裁决：2026-10-22 用户认可当前设计，并确认没有真实手柄，授权提交推送和关闭issue；不记为硬件验收。

## 上下文锚点

- 规则：[CLAUDE.md](../../../CLAUDE.md)、[代码质量](../code-quality.md)、[工作流](../agent-workflow.md)、[测试治理](../../testing/governance.md)。
- 代码：packages/game/index.html:1；shell/main-loop.ts；shell/bootstrap.ts:463、1095；tools/tools-panel.ts:1003；tools/minimap.ts:267。
- 不得重新引入：WASD方向映射、虚拟按键伪造KeyboardEvent、因松开触控而释放仍按住的键盘输入、变更320×200帧缓冲。
- 既有测试：shell/input*.test.ts、tools/display-scale*.test.ts、tools/tools-panel*.test.ts、tools/speedrun/store*.test.ts。

## 验收条件

- 功能：横竖屏均按8:5最大适配、主要触控目标至少44px；工具内容可滚动；按键相对窗口定位。
- 输入：确认短按不因逻辑帧间隔丢失；松开/取消/失焦无卡键；键盘与触控的同键持有互不误释放；保留方向后按优先及fade合同。
- 辅助显示：小地图默认关、开关与桌面分开；启用后左上半透明叠加，无缩放按钮；移动端无FPS、计时器。
- 测试：真实公开输入端口及DOM事件的必要合同；相邻回归、game typecheck、lint、docs检查零诊断。
- 视觉：320×568、375×667、390×844、667×375、844×390和桌面检查画面/控件/抽屉，无页面横向溢出。
- E2E：本轮只做启动/标题/菜单/场景交互烟测，不新增剧情或预览起点证据。

### 代码质量与低成本复验

- 八维：围绕输入Owner、布局职责、事件释放、可访问按钮与滚动、既有桌面caller定向审查；结果在实现后写回。
- 候选基点：92e901806；单一写入Owner=Codex；调用边界main→bootstrap→shell/tools。
- 快速复验：game typecheck、定向Vitest、6005浏览器视口检查；源码或caller改变后重核对应证据。
- 全仓check/官方coverage/protected：试验观感确认后的集成窗口再跑，不预填通过或刷新官方基线。
- 自验不等于独立验收；最终代码质量、用户产品验收和可集成分别记录。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Owner / 隔离：Codex，干净main基点新建codex/game-mobile-layout分支。
- 修改白名单：packages/game页面、shell移动承载和输入、相关tools呈现与测试；本卡、看板、索引及相应文档登记。
- 前提：verified（上述当前源码）；范围/方案：agree；用户产品裁决：已批准试验。
- build 准入：Codex build allowed。

### 进入 done 前：独立验收

- 贡献者交付与自验：Codex实施/自验；各轮检查及其候选边界保留在下文，不以早期日志冒充最终候选。
- 独立复核：只读reviewer `/root/mobile_final_review` 核冻结候选与原生证据；唯一P2返工后于356ac4fad定向复验接收，见[独立记录](../evidence/GAME-MOBILE-LAYOUT-1/independent-review.txt)。Codex核差异与原件，收口官方门。
- 用户体验/产品验收：2026-10-22用户认可设计，确认无实体手柄，授权提交/推送/关闭issue；不记为硬件验收。
- done 准入：review，集成质量门与CI尚在执行，硬件未测明确披露。

## Draft: 设计与风险

- 游戏外壳管理媒体查询、自动适配与六个虚拟控件；控制器只输出现有抽象键。
- 方向盘固定窗口左下，两个大圆确认/取消固定窗口右下；一体圆盘支持滑动换向、中心停步，不设更多按键。
- 手机无标题/上下栏，只有右上一个工具按钮；最大化完整画面，小地图不预留区域；桌面保留原有缩放/工具功能。
- 风险：多指/取消导致卡键、软键盘改变视口、工具遮挡、跨端偏好污染。用输入所有权、释放边界、dvh/安全区和隔离偏好缓解。

## Build: 实现与自测

- Coding Owner：Codex。
- 实现：窗口固定的一体四方向盘、确认/取消圆按钮，输入按contact归属并释放；保留键盘原映射及fade行为。
- 用户迭代定稿：不设更多按键、标题或上下栏；小地图左上半透明叠加、不规避、手机无缩放按钮。
- 手机工具：设置/地图及折叠的战斗/对话；移除快捷键、计时器、FPS设置、全屏和存档导入导出；隐私入口并入设置。
- game check：`pnpm --filter @type-pal/game check`，329文件/3679测试、typecheck通过；[完整日志](../evidence/GAME-MOBILE-LAYOUT-1/game-check.txt)。
- lint：`pnpm lint`，5735文件、0 error/warning/info；[日志](../evidence/GAME-MOBILE-LAYOUT-1/lint.txt)。
- 触控反控：[原件索引](../evidence/GAME-MOBILE-LAYOUT-1/input-controls.json)：精确源码/测试副本，控制9绿；重复click、冻结换向各恰一指定AssertionError；恢复9绿，临时树已删除。未改运行中页面源码作反控。
- 新增13个用例分别核输入/滑动/取消/失焦/归属/释放、手机裁剪UI和偏好边界；不以数量冒充覆盖率。当前官方coverage基线未重算。
- docs：`pnpm check:docs`，125个工具测试与全部文档门通过；[最终日志](../evidence/GAME-MOBILE-LAYOUT-1/docs.txt)。初次两个被Git忽略的.log链接已改为可检出的.txt证据，保留[修复前原始结果](../evidence/GAME-MOBILE-LAYOUT-1/docs-before-link-fix.txt)。
- build：`pnpm --filter @type-pal/game build`通过；[日志](../evidence/GAME-MOBILE-LAYOUT-1/build.txt)。`git diff --check`通过。
- 未跑：手机实机、手柄硬件、生产SW/部署。

## 视觉验证记录

- Owner：Codex；Timing：dev-functional。
- 方式：真实本地页面、多尺寸浏览器视口、截图核读、实际按钮操作。
- [六种视口DOM原件](../evidence/GAME-MOBILE-LAYOUT-1/browser-geometry.json)：320×568、375×667、390×844、667×375、844×390、1280×800。
- 手机画面精确8:5、无页面横向溢出，方向触摸区50px以上、圆按钮64px以上；位置相对窗口及安全区，非画布。
- [横屏](../evidence/GAME-MOBILE-LAYOUT-1/landscape.png)、[竖屏](../evidence/GAME-MOBILE-LAYOUT-1/portrait.png)已直接核图。
- 通过真实虚拟取消→确认→取消链进入/退出状态页；[状态页截图](../evidence/GAME-MOBILE-LAYOUT-1/touch-status.png)。手机工具实看为音频/音源，删除项不出现；桌面1280×800仍960×600且虚拟键隐藏。窄于默认960px画布的窗口使用移动布局，[正常预览窗口](../evidence/GAME-MOBILE-LAYOUT-1/window-preview.png)也已看图。
- 参考[RetroArch overlay](https://docs.libretro.com/development/retroarch/input/overlay/)和[PPSSPP controls](https://www.ppsspp.org/docs/settings/controls/)，借鉴整体方向区、透明度和滑动交互，未复制第三方美术资源。
- 边界：未测手机硬件多指/Safari安全区/手柄；不是全剧情E2E、生产SW或发布验收。

## Review: 审查与返工

- 本轮为Codex直接实施；差异与caller审查，不冒充独立贡献者交付或既有大文件全文关闭。
- A正确性：viewport与framebuffer分离、contact持有隔离、方向顺序恢复、fade回归通过；真机触摸仍待。
- B注释：只解释输入所有权、死区/外圈容错和布局责任；不宣称SDLPal具有手机真值。
- C内聚：game-shell负责布局，touch-controls负责事件，input负责快照；bootstrap只接线。
- D复用：虚拟与键盘进入同一AbstractKey；复用现有工具、小地图及音频UI，不复制业务。
- E测试：真实输入源/DOM事件；仅宿主capture/几何模拟，配对两个单红反控；未新获官方覆盖率信用。
- F可读：六键命名明确、Typed contact/WeakMap避免从DOM字符串强转；工具移动裁剪显式分支。
- G简洁：删除试验的更多键/标题/栏/避让/手机高级功能，不保留失败交互的兼容路径。
- H可测：输入端口和浏览器几何可独立复验，页面生命周期资源与测试短宿主分开。
- 逐文件读域：game-shell.ts/css、touch-controls.ts/test、presentation.ts、mobile-presentation.test.ts、tools-panel.mobile.test.ts与styles.d.ts全文；input.ts、display-scale.ts、fps-overlay.ts、minimap.ts、speedrun/store.ts及两analytics文件实际差异与相邻caller；main.ts全文和bootstrap接线段。未将bootstrap/tools既有全文升级为本卡关闭。
- 产品设计已认可；全仓check/coverage/protected与CI在当前集成窗口执行，真机及手柄硬件未测另列限制。

## 用户验收

- 用户认可当前设计；2026-10-22确认没有真实手柄，授权按当前实现提交、推送并关闭issue。
- 手柄硬件未测不写通过；只交付浏览器standard映射支持，型号/系统实际兼容性需用户反馈。

## 交接日志

- 2026-10-22 Codex：核当前画布/输入/工具caller，开卡准入；按用户多轮迭代完成最简叠加布局并实跑；见本卡Build/视觉/Review。下一步用户观感验收。

## 下一位 Agent 提示词

无，当前由Codex完成集成质量门、CI和issue回执。

## 2026-10-22 用户认可布局后续

- 用户已认可当前设计；新增虚拟键显示开关，手机默认开且记忆，工具入口始终保留。
- 同步推进原issue #7手柄范围：标准Gamepad映射，十字键/左摇杆、底部确认/右侧取消及Start菜单。
- build allowed：Codex单一Owner，新增shell手柄adapter和偏好、工具/外壳接线、必要测试；不改机制/Save。
- 依据：[MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)，每rAF重读设备；只对standard映射接线，非standard不猜键。
- 验收：多输入所有权、断开/失焦释放、摇杆死区与回中、防持续按下重发、工具/隐藏后不自动续按；手柄硬件仍需实际设备验证。
- 后续用户确认没有实体手柄并授权提交；这不外推为手柄硬件通过。

### 后续实现与验证回执

- 虚拟键开关位于手机「设置 → 操作 → 显示虚拟按键」；默认开、浏览器记忆。隐藏时解绑触控并只释放触摸contact；工具按钮始终存在。
- 标准手柄：0确认、1取消/菜单、9菜单；12–15十字键；左摇杆四方向主轴，进入死区0.35、回中0.2。
- 每rAF读取最新设备，仅提交发生变化的contact；断开清手柄自身contact；失焦/工具阻塞后须回中松键，避免续按。非standard映射不猜键。
- 手柄与键盘/触屏共享真实input快照及所有权；不派发伪KeyboardEvent、不改机制、WASD或Save。
- 7个typed手柄合同 + 1个偏好合同；完整game check 331文件/3687测试、typecheck通过；[本轮日志](../evidence/GAME-MOBILE-LAYOUT-1/gamepad-check.txt)。
- 浏览器实测：关闭→关面板→刷新仍隐藏，工具按钮可见；重新开启立即恢复；[关闭证据](../evidence/GAME-MOBILE-LAYOUT-1/controls-hidden.png)、[设置界面](../evidence/GAME-MOBILE-LAYOUT-1/input-settings.png)。
- 手柄模拟测试与真实硬件分开：**没有连接实际手柄验收**；不能宣称全部型号或手机蓝牙路径已通过。
- 代码八维补审：gamepad-input全文核poll transition/死区/断开/重臂、typed快照与rAF生命周期；touch-preference核默认/持久化/存储失败内存兜底；GameShell差异核解绑与保留工具入口；工具差异仅新增操作设置和说明；新测试核真实KeyboardInputSource/合法GamepadState，未mock核心输入。
- 新增[手柄反控](../evidence/GAME-MOBILE-LAYOUT-1/gamepad-controls.json)：原控制7绿，去掉standard映射守卫恰一指定AssertionError，恢复7绿；隔离临时树已清理。不是硬件验收或官方coverage基线。
- 本轮lint 5743文件/零诊断、构建通过、完整文档门含125工具测试通过；[lint](../evidence/GAME-MOBILE-LAYOUT-1/gamepad-lint.txt)、[构建](../evidence/GAME-MOBILE-LAYOUT-1/gamepad-build.txt)、[文档](../evidence/GAME-MOBILE-LAYOUT-1/gamepad-docs.txt)。上一段3679用例为前一候选，未改写历史日志。

## 2026-10-22 集成核验

- 用户授权提交、推送和关闭[issue #7](https://github.com/IllegalCreed/type-pal/issues/7)。部署不在本卡范围，不以合并代替上线。
- 补齐实际caller缺口：AVI跳过、DOS splash退出、结局无限等键原先只听keydown；新增可消费的抽象action入口，触控/手柄先由modal消费，避免泄漏到下一页。键盘现有capture路径保留，RNG/FBP默认不可跳的机制保持。
- 视频设playsInline并挂游戏stage，虚拟键位于其上；autoplay拒绝仍由实际点击重试处理，不绕过浏览器手势策略。
- [原生红绿证据](../evidence/GAME-MOBILE-LAYOUT-1/modal-input-evidence.json)：3个真实caller回归修复前均为指定AssertionError，修复后及相邻14文件/93测试通过。新增gamepad-host两例核rAF新鲜设备、失焦/隐藏/工具阻塞/回中和dispose、API拒绝时键盘仍可用；game-shell一例核横竖屏适配与桌面比例恢复。仅模拟浏览器宿主，未mock核心输入。
- [正常开场截图](../evidence/GAME-MOBILE-LAYOUT-1/opening-touch-menu.png)：实际点击虚拟确认跳过1/2.mp4后停留标题菜单；无误开新游戏。不是全剧情E2E或硬件实测。
- 补审读域：input新增modal消费合同；avi播放容器/inline/监听清理；splash退出finally；ending等键清理；game-shell叠加层；新增测试全文。A核动作消费、下一页泄漏和生命周期，B核注释与不可跳机制边界，C/D复用现有抽象键与单一事件入口，E核合法fixture/真实caller与独立完成oracle，F/G局部新增且无伪键盘或轮询快照第二消费者，H以真实input端口加宿主边界模拟复验。
- 集成首轮coverage在迁移器未改用例遇5000ms超时；保留[失败原件](../evidence/GAME-MOBILE-LAYOUT-1/coverage-concurrent-timeout.txt)，未提升超时或改测试选择；待全仓check结束后串行重跑。
- 主分支实际同步9b4df7145（包含e8566c2c7）；保留其存档、共享解码、提取器及文档门修复。当前卡review，合并/CI/覆盖率结果待实际运行写回。
- 集成检查：同步主分支前的全仓`pnpm check`通过（含631个editor文件/4943测试、96个migrate文件/739测试）；同步9b4df7145后全仓`pnpm typecheck`与5774文件零诊断lint通过。两次检查的候选边界不同，不伪称同一提交全仓check。
- [生产构建实点](../evidence/GAME-MOBILE-LAYOUT-1/production-touch-status.png)：6006本地dist、375×667，取消打开菜单，确认进入状态页并可返回；不是阿里云上线或离线验收。已关闭临时preview实例并恢复视口。
- 外壳接线补测：`game-shell.test.ts`现为2例，新增真实触控source经外壳连接、隐藏时保留同键键盘owner、重新显示和工具阻塞后恢复；宿主仅模拟媒体查询/ResizeObserver/rAF/capture，测试临时页面监听由宿主清理。未改变产品TS实现。
- 清理移动端已移除的计时器tab/FPS残留定位CSS；不改变已验收布局。
- 首次完整覆盖率复算中，各包通过而汇总精确比率小退；[失败日志](../evidence/GAME-MOBILE-LAYOUT-1/coverage-before-shell-integration.txt)保留。外壳接线补测后汇总门通过、四项范围变化获官方ratchet确认；[该候选日志](../evidence/GAME-MOBILE-LAYOUT-1/coverage-shell-integration-passed.txt)保留，不视作后续键盘修复的最终基线。
- [键盘激活红绿证据](../evidence/GAME-MOBILE-LAYOUT-1/keyboard-activation-evidence.json)：聚焦虚拟按钮时，原keydown进入全局键盘源，随后native click再次激活；修复为由按钮消费激活键，并阻止repeat默认激活，其他方向键仍进入全局源。隔离真实input/touch source的指定业务断言先红后绿；正式用例补Space/Enter/NumpadEnter、repeat与其他键。临时树已清理，无伪KeyboardEvent作为产品输入桥。
- 键盘修复后完整game check为333文件/3715测试、typecheck通过；[日志](../evidence/GAME-MOBILE-LAYOUT-1/final-game-check.txt)。同一正式用例随后扩充了激活键别名，运行时身份数量不变，最终coverage/CI验证当前正文。
- [最终生产构建实测](../evidence/GAME-MOBILE-LAYOUT-1/production-keyboard-activation.png)：375×667，虚拟取消打开菜单后，将焦点置确认按钮、实际按住空格500ms，只进入一次状态页；无重复确认。构建通过，临时preview已关闭、视口已恢复。
- 文档门返工：新主分支增加progress完整性检查，发现两处artifact-only记录的历史envelope被本卡绑定替换；已恢复原envelope，把当前delta单列maintenanceReview，保留[修复前完整输出](../evidence/GAME-MOBILE-LAYOUT-1/docs-before-envelope-restored.txt)。progress恢复0 integrity issues；未修改任何检查规则。

### 最终候选验收（GitHub CI前）

- 最终产品源码356ac4fad，测试增补候选1c0b2acbd；后续提交仅登记基线和文档。完整SHA、源码指纹、各轮附件hash与未执行边界见[最终证据](../evidence/GAME-MOBILE-LAYOUT-1/release-evidence.json)。
- 只读独立复核逐文件核八维、caller与原生报告；唯一P2为打开的工具面板未随布局切换更新，已订阅LAYOUT_CHANGE且仅在打开时重绘。[原生红绿](../evidence/GAME-MOBILE-LAYOUT-1/live-tools-evidence.json)恰一指定业务红→3绿；新增关闭态延迟渲染断言的同一用例再次3绿，经独立复核接收。其余限定读域未见阻断，未升级未改引擎全文信用。
- 覆盖率保留[关闭态补测前失败](../evidence/GAME-MOBILE-LAYOUT-1/coverage-before-closed-panel-contract.txt)：20024测试全绿但新guard未执行，精确branches比例比中间候选微降。补入合法关闭事件及DOM保持空的业务断言，产品代码、门槛、排除、超时均未调整。
- 最终官方`coverage:ratchet`退出0：755源码文件、20024 fast测试；statements71884/79706，branches52105/62132，functions13626/15182，lines64198/69749；game为328测试文件/3688测试。[完整日志](../evidence/GAME-MOBILE-LAYOUT-1/release-coverage.txt)与原生汇总见最终证据。源/测试范围及比例通过并更新基线；此项不代替CI的protected base核验。
- 冻结候选全仓`pnpm typecheck`通过，[日志](../evidence/GAME-MOBILE-LAYOUT-1/release-typecheck.txt)；最终产品构建通过，[日志](../evidence/GAME-MOBILE-LAYOUT-1/release-build.txt)。新测试共8文件/30例，使用真实input/adapter/caller；历史完整game check的333文件/3715测试不冒充本轮新增布局用例后的全量结果。
- 完整文档门含125工具测试和消费者通过，最终证据/卡面delta再核静态消费者；lint重新核最终文件集。原始日志与后续CI保留各自候选，不把新文档增量当成全仓文档迁移完成。
- 产品已由用户认可，用户明确无实体手柄仍授权软件提交；实体手机/手柄、Safari安全区、完整剧情E2E、生产SW和阿里云部署均未测或未做。卡暂review，待实际PR质量门后收口。

### GitHub首轮库存登记返工

- [PR #8](https://github.com/IllegalCreed/type-pal/pull/8)的375bb5a26：文档与安全检查通过；[覆盖率任务](https://github.com/IllegalCreed/type-pal/actions/runs/39651740329)在前置quality-tools被拦，未执行CI类型/覆盖率。原因是本卡新增14个tracked代码路径后，专项账本仍声明3338而真实3352；[失败原件](../evidence/GAME-MOBILE-LAYOUT-1/ci-ledger-before-sync.txt)保留。
- 本地真实47例quality-tools同样复现恰一登记断言失败；仅同步账本库存3352、pending2870、未闭合2996，既有356closed/126review及逐路径表/历史正文不变，0新增专项closed。14路径由main→本卡实际新增清单核定，不修改工具、测试、规则或产品源码。
- 同步后47/47通过；这是仓库登记修复，不是游戏行为修复或覆盖率重算。源码与官方20024测试候选仍为1c0b2acbd，后续GitHub门检查实际新提交。
