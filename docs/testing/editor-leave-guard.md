# 未保存修改的离开保护：实现与验证

父卡：[EDITOR-LEAVE-GUARD-1](../ops/archive/tasks/done/EDITOR-LEAVE-GUARD-1-unsaved-project-changes.md)，r1。
Owner：Codex；实现基线 d46d63fa，产品/测试候选 10c84238。当前done，三席终审均accept、无返工，Codex已核同候选零漂移；用户授权按既有验证收口，非完整E2E。
终审提交GLM 11d6026b / Kimi 2d8e56d0只改任务卡；本次接收不重跑已有验证，不代签或代记用户手动复验。
用户随后在仅待验收确认的上下文回复“继续推进”，2026-09-13按本卡收口授权登记；不外推为其他任务免签。
首批实现 ceec744a，随后补强“保存后继续”与“放弃修改”的点击身份；不改变 r1 设计合同。

## 实现范围

- 一个 session-local ProjectLeaveGuard 管理新建、打开、保存、另存为、导出的同步互斥；旧 saveInFlightRef/
  exporting 的排他语义合入同一 gate，不并存第二条旁路。它不提供文件写权限，也不改变 A-02/A-03 持久化协议。
- 当前主/脚本 session dirty 共同决定是否提示；显式放弃与当前修改版本绑定。onOpened 前核请求和两份历史版本。
  保存显式区分 committed/cancelled/failed；清理警告仍表示已提交，有更新修改则不能进入无条件继续态。
- 继续按钮把本次渲染所表达的 ready/decision 选择交给 guard 校验；两种动作使用不同 React key，
  不能因后台修改使 ready 降级而把原来的“继续打开”点击解释成新的“放弃修改”。
- 复用 DsDialog/DsButton，取消默认焦点、同尺寸/间距、无装饰图标；保存期间仅一个顶层 modal。
  取消后回原 opener，opener 已移除则聚焦现有工作区，不新增选择或作者命令。
- 刷新/关闭监听读实时 session 与 IO 状态；卸载失效旧 lease。浏览器强杀、未提交到 session 的局部草稿仍不保证。
- 为使 LG-08 已登记的入口失效页真正可达，修正原 App 中 context 的 scene.id 与 entries 索引的空场景提前解引用；
  不造默认场景、不改变入口数据或迁移内容。D-01 历史算法、schema/content20/SAVE8、玩家存档未改。

## 代码级回归与隔离边界

- `project-leave-guard.test.ts`：18 项，真实双 session + 当前 blank seed/loader；dirty 三态、两入口、取消、
  完全撤销、discardRedo 保守失效、四类 IO 互斥、保存结果、晚到主/脚本命令、hydrate、卸载重连、unload。
- `App.leave-guard.test.tsx`：27 项，真实 App 菜单、保存函数、序列化、writer、open 和正式重开；替身只提供 FSA 目录、
  原生 picker 与 origin 存储记录边界；省略 SceneCanvas 绘制。存储映射不是原生 IDB 事务测试，不能借此宣称身份/锁协议重新验收。
- `author-save-conflict.test.ts` 既有 36 项用例的业务断言保持；AST harness 从实际 App 抽取 save，注入真实新 guard 并 connect，
  去掉已退役的 saveInFlightRef fixture；未复制保存实现，未修改历史审计探针。
- DS adoption 统计按新增 ProjectLeaveDialog 将 91 更新为 92；仍是实际 gate 输出断言、2 条既有证据豁免不变。

## 单点负控制

临时配置 `/tmp/type-pal-leave.MtfuoI/negative.config.mts`：使用当前 editor Vite 配置，仅在 pre transform
中替换下面精确字符串。每模块每次加载要求命中恰一次（两测试环境各载入一遍不等于两个不同突变）；
生产文件未被改写，配置无 timeout/skip/排除/阈值调整。可按本表重建，不依赖另一 AI 口述。

| LEAVE_NC | 唯一替换（from → to） | 必须失败的业务断言 |
|---|---|---|
| script | guard `return this.main.isDirty() \|\| this.script.isDirty()` → `return this.main.isDirty()` | 仅脚本 dirty 时真实新建回调/选夹错误启动，unload 漏保护 |
| result | guard `outcome === 'committed'` → `outcome !== undefined` | failed/cancelled 被误授予 ready 保存后继续态；此为 guard 结果协议反例，不宣称真实 IO 失败会清 dirty |
| revision | guard `return this.isCurrent(lease) && this.unchanged(lease.revision)` → `return this.isCurrent(lease)` | 主/脚本晚到命令后真实打开/另存为错误调用 onOpened；断言先查回调，非先查文案 |
| menu | App `execute: () => requestLeave('new')` → `execute: () => props.onBackToPicker?.()` | dirty 的真实菜单直接调用卸载回调；断言先查业务调用，非因缺 modal 的 TypeError 而算红 |
| choice | guard 删除 ` \|\| decision.phase !== choice` | 已保存按钮的 click capture 阶段新增主命令后，旧 ready 点击被错误当成 discard，真实 picker 错误启动 |

命令：在仓库根运行 `LEAVE_NC=<mode> pnpm --filter @type-pal/editor exec vitest run --config /tmp/type-pal-leave.MtfuoI/negative.config.mts`。
不设置 LEAVE_NC 为同配置无突变正控。补强后五针日志 `consent-nc-*.log`；初版断言先检查 modal/通知的日志仅作开发记录，
不替代最终业务断言。新增 UI 回归中的异步门使用 entered/deferred，未以增加超时放行。

## 原生功能与视觉（Codex，2026-09-13）

独立 Edge profile `/tmp/type-pal-leave.MtfuoI/edge-profile`、专用 6011、真实系统目录
`/tmp/type-pal-leave.MtfuoI/project-a`；未碰日常 6010、Chrome 或 PAL 作者工程。
原生目录选择/授权和产品点击由 CUA 操作；Playwright 仅提供隔离浏览器启动、视口/截图/测量与一次性 IO 探针。
FSA、IDB、Web Locks 保持原生，未用 OPFS 代替系统目录。

| 操作 | 实测结果 |
|---|---|
| 启动屏新建空白项目，系统选夹并允许写入 | 创建 project-a；正常进入编辑器与已保存态 |
| 改场景名称→文件→打开项目 | 未弹目录选择，先显示三按钮确认框；默认焦点取消 |
| 1280×900 / 720×640 | footer 三按钮均 36px，高度一致、水平间距 8px，无水平溢出；取消、放弃、先保存文字完整 |
| 冻结产品代码后：改为 LG最终刷新验证→真实 Cmd+R→Cancel | 原生 Reload site 提醒；取消后名称、未保存状态、编辑会话均仍在 |
| 打开→先保存，原生 Writable close 单次挂起约 25.8 秒后放行 | 等待期仅一个保存 modal；后进入“已保存/返回编辑/继续打开”，没有自行发起选夹 |
| 点击激活过期后，重新点击继续打开 | CDP `Runtime.evaluate` 明确 `userGesture:false` 测得 isActive=false；新 CUA 点击正常打开系统选夹 |
| 取消系统选夹 | 留在原项目，场景名 LG最终刷新验证、已保存态仍在；磁盘 SceneIndex 及 save-state committed 独立核对 |
| 新修改 LG失败后保留，下一次原生 Writable close 单次抛 NotAllowedError | 回到可操作确认框，完整显示“LG 测试：目录写入失败”；仍是未保存状态，没有替换项目 |
| 取消失败确认→继续改为 LG恢复可编辑→保存 | 焦点回“场景编排工作区”；可继续改名，重试成功，磁盘 SceneIndex 为新名、save-state committed |

截图在同目录：`decision-wide.png`、`decision-narrow.png`、`save-held.png`、`saved-ready.png`、
`save-failed.png`、`retry-saved.png`。宽/窄及错误图均由 Codex 实际查看；首两张布局图在补焦点 fallback 前拍摄，
之后未改尺寸/样式；最终取消焦点、失败、重试按补后实现实测，不把早期截图冒称最终焦点证据。
原生主流程对应 ceec744a；其后的点击身份补强只改变 choice 参数校验和 React key，无布局/持久化/选夹调用变化，
由新增真实菜单竞态回归与 choice 单点负控制验证，复用已有视觉证据，不让两席重复操作原生流程。
慢 IO 探针只覆盖隔离页面的 FileSystemWritableFileStream.prototype.close，首次调用即还原原方法；
挂起由显式 release 结束、错误只抛一次，不修改任何产品代码或保存协议。

### 准备期失败 / 不计入通过的尝试

- 首次仅键入未成功提交字段；随后用 CUA setValue + Tab 真实提交并核 dirty，前者不作业务证据。
- 初次浏览器准备与源码热更新交错，Vite 记录 App export 不能 Fast Refresh→main 重建→页面 reload，
  取消刷新后已回 picker；该混杂轮不算保留验证。停止编辑产品文件、重新打开项目后，独立重复同一刷新/取消动作通过。
  不把开发服务器热重载声称为普通产品导航，也不要求用户绕过 beforeunload。
- Playwright 默认 evaluate 会带用户手势，不能用其读取的 isActive=true 声称激活未过期。
  本轮最终用 `Runtime.evaluate(... userGesture:false)` 采样得到 false，再 CUA 点击继续。
- context close 首次遇已由 CUA 处理的旧原生弹框协议错误；移除观测 listener 后收尾，最后按精确测试主 PID 16599
  终止仍存活的独立浏览器。已核该 profile 无剩余进程；自建 6011 也已停止，测试目录未删。

## 全仓质量门与剩余边界

最终完整 `pnpm check`（`check-consent.log`）exit0：七包 6,918 项，editor 226 文件 / 2,350 项；
lint 48 条既有 warning / 11 条 info，零 error。定向含相邻 81/81；五针分别 5/2/7/10/2 项业务红，均 exit1。
官方 ratchet 与单次严格 fast（均 `TYPE_PAL_COVERAGE_BASE_REF=d46d63fa`）exit0，6,430 项 / 616 生产文件；
editor 207 测试文件 / 2,191 项 / 218 生产文件。逐包复算原有 fast test fileEntries 的计数/身份摘要完全保留，
只新增两测试文件45项与三生产文件，旧源码零移出，未改执行排除/超时/阈值。

| 口径 | 行 | 语句 | 函数 | 分支 |
|---|---:|---:|---:|---:|
| 全仓 fast | 48,140/68,878（69.89%） | 53,321/78,695（67.76%） | 10,083/14,430（69.88%） | 38,210/61,772（61.86%） |
| editor fast | 22,034/27,695（79.56%） | 24,437/31,683（77.13%） | 6,050/8,029（75.35%） | 18,906/27,391（69.02%） |
| ProjectLeaveGuard | 60/62 | 71/73 | 21/21 | 61/63 |
| ProjectLeaveDialog | 3/3 | 3/3 | 2/2 | 20/20 |
| useProjectLeaveGuard | 12/12 | 14/14 | 5/5 | 2/2 |

guard 两条未命中臂保留分母，不以私自更改 session 私有状态或删除防御来凑 100%；未将全仓最终90%/85%目标宣称达成。
本次未重跑 coverage:full 或完整浏览器 E2E。使用 pnpm/Vitest 既定官方执行档，Vite 只为临时单点突变提供隔离加载。

第一次完整 check：editor 2346 通过 / 1 失败，唯一失败为 DS 文件统计 91→92 未更新；
不取多数放行。修正统计后的 `check-final.log` exit0（补 PAL 取消前）；`check-release.log` exit0（6,916 项，
ceec744a、含 PAL 取消）、`ratchet.log`/`strict-fast.log` 均 exit0（6,428 项）。这些是补点击身份前的中间候选，
不冒充后续完整候选的最终质量门；最终使用 `check-consent.log`/`ratchet-consent.log`/`strict-consent.log`。
开发期曾出现 fixture 的共享脚本字段写错、jsdom Blob/secure-context 缺模拟及测试括号遗漏；均在实际验证中修正，
未改产品格式容忍它们，未对这些准备失败声称是回归负控。

### 最后自审的真实返工

ceec744a 的 `confirm()` 同时承担 discard 和 ready，但只读取调用时 phase；后台命令把 ready 降回 decision 后，
旧继续按钮回调可能取到新 phase，错误授予放弃权限。新增两条正式回归在 ceec744a 上均先红：guard 返回 open 而非
拒绝、真实 App 的 ready 按钮 click capture 产生新命令后 picker 被调用 1 次（`consent-before.log`）。
修复为调用方携带点击所表达的 choice + guard 比对 phase，并给两动作不同 button key；两例转绿，
全定向含相邻 81/81（`consent-after.log`）。属于 LG-06 已签目标的实现返工，不重开设计、不隐瞒中间候选曾过质量门。

R4 集中用例仍待执行：空白工程中主属性/脚本交替编辑→取消离开→保存→打开另一工程→重开原工程核值。
该用例不承诺已解决 D-01 全局历史顺序；A-03 的系统重启/恢复证据复用，不再重复全套。
本卡不保证系统强杀、浏览器未派发 beforeunload、未进入 session 的领域草稿，亦不为自动保存作承诺。
