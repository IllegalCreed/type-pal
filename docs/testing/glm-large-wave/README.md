# GLM 五批大型当前合同补测（A–E）

[任务卡](../../ops/tasks/TEST-GLM-LARGE-WAVE-4-five-large-batches.md) ·
[60 个冻结目标](targets.json) · [只读冻结校验](verify-targets.mjs) · [上级](../README.md) ·
[A 批回执](receipt-batch-a.md)

本包给**一个 GLM 测试 Coding Owner** 顺序完成五个大批。每批 6 个窄工作组、12 个互不重复的
当前生产源码目标；五批共 30 组/60 目标。上一轮 A–H 每批只有 4 组，本轮每批容量更大。
预计每批约 30–50 条有意义的新测试供排期，不以数量或覆盖百分比为验收门。已被旧断言证明、
只有防御死臂或没有当前消费者的轴写 `existing-proof`/`unreachable`，不凑文件。

## 冻结与准入

- 生产冻结 `9c35748a0e36d6b1e4368a6b427ed63ab6d6e700`；正式 fast 基线 SHA256
  `a682d4e1b970df7c2f5a100ca6a1c8ed9cc23e7a612b7328998949db9fa75b41`，
  10,380 项/730 生产文件/分支 49,081/63,398（77.42%）。不为派单重跑覆盖。
- 五批目标目前的**整文件未命中臂选题空间**分别为 A 639、B 515、C 368、D 650、E 328。
  它们不是授权逐臂强打、保证增量或缺陷数。当前真实 public entry、调用者和旧测试须每组重读。
- `node docs/testing/glm-large-wave/verify-targets.mjs` 校验 60 目标、五个 source digest、
  与 Kimi/前一轮三条 GLM 冻结目标零交集、正式基线及生产源码未漂移。冻结表是准入边界，
  不是旧断言去重证明。若 main 产品源改变，停止该受影响组交 Codex 复核，不自己改冻结值。
- 第二阶段工作先读 [`READ-FIRST`](../../phase2/READ-FIRST.md)；一阶段游戏机制/E2E/地图重建不在此卡。
  本卡产品、schema、存档、资产管线和用户可见行为均不变。对保存/迁移/脚本的测试只证当前公开合同，
  不推断新政策、不引入旧版本兼容或隐式 `sys:*` 全局槽。

## A · 编辑器命令表单与作者工作区（A01–A06）

真实调用锚：`packages/editor/src/ui/CommandForm.tsx:28–34` 组合四类表单；
`DataMode.tsx:45/49` 使用 SharedScriptTab/StampLibraryTab。只测这些组件承诺的表单/委派边界，
有真实 session 的族须查落库和 undo；不接 App 总壳、ScriptEditor 连续播放、角色换装或已知朝向清除缺陷。

| 组 | 源码对（完整路径见冻结表） | 待独立核旧测后的窄合同 |
|---|---|---|
| A01 | `command-form-control.tsx` + `command-form-world.tsx` | 当前 typed 控制/场景命令的必填、清除、取消与完整输出；`makeLoadScene/retargetLoadScene` 只在现行合法输入上断言字段保全，不把 `EDITOR-SCENE-FACING-1` 已知红固化为绿。 |
| A02 | `command-form-dialogue.tsx` + `command-form-actor.tsx` | 对话行/角色引用选择的有效输入、错误反馈、提交/取消；当前 canonical ID，不造旧下标身份。 |
| A03 | `DataMode.tsx` + `SharedScriptTab.tsx` | 真实数据页切换和 authored script 选择/空态；只到公开 callback 或真实 EditSession，不冒充 App 路由/保存。 |
| A04 | `SceneScriptWorkspace.tsx` + `AmbienceTab.tsx` | scene/hook 工作区选择与撤销回显、氛围资源 clear/disabled；只证表单数据，不启动过场/音频听感。 |
| A05 | `StampLibraryTab.tsx` + `SpriteUploadWizard.tsx` | 当前图章目录身份/分类与合法小 PNG 上传向导的真实字节/尺寸、取消零提交；不扩地图碰撞或资产迁移。 |
| A06 | `EnemyAnimPreview.tsx` + `FireEffectPreview.tsx` | 真实小资源解码的可见成功/失败、在途换选归属与释放；只证预览端口，不证明整场战斗动画。 |

A 批须在自己的 6086–6089 空闲端口做两条最小功能视觉：一条命令表单清除/取消，
一条资源或预览选择/失败恢复。各在 1440×900 与 1000×720 看实际面板宽度，截图和 console 记录分开。

## B · 编辑器会话、索引与派生状态（B01–B06）

调用锚：`packages/editor/src/main.tsx:24/28` 接入 EditSession/ScriptEditSession；
`packages/editor/src/core/project-diagnostics.ts:29/41/57` 消费工作副本、引用快照与脚本态。
此批涉及作者保存，但 GLM 只在内存 FSA 或自有 `mkdtemp` 操作，不能写正式工程。

| 组 | 源码对 | 待独立核旧测后的窄合同 |
|---|---|---|
| B01 | `core/script-editor.ts` + `ui/ScriptTree.tsx` | 公开 visitor/locator 的有序身份、body 分支及真实树的显示/选中；不读私有栈，不重做 ScriptEditor 总工作流。 |
| B02 | `core/project-reference.ts` + `core/project-reference-adapters.ts` | live 引用 domain/owner/path、稳定排序与缺席边界；实际消费对象深快照，旧引用矩阵已证则登记。 |
| B03 | `core/edit-session.ts` + `core/editor-derived-store.ts` | 单命令/组合命令的撤销重做与派生版本 current/stale/failed，输入保真；不另造共享产品状态。 |
| B04 | `ui/use-editor-project-session.ts` + `core/project-io.ts` | 当前项目会话切换与 serialize/重读的完整作者态；仅当前 canonical 内容，不加旧版升级或真实磁盘发布。 |
| B05 | `core/author-save-journal.ts` + `core/project-diagnostics.ts` | 内存目录中的 prepare/commit/recover 精确文件序与失败保真、诊断对象/路径；不写 `projects/pal`。 |
| B06 | `core/playback.ts` + `core/tileset-references.ts` | 公共播放状态与瓦片集引用归属/排序；不从播放回调推断实际剧情或战斗执行。 |

B 批须做一条 ScriptTree/会话选择→修改→undo 的隔离功能视觉；真实作者态与截图分开记证。

## C · Reforge 脚本与演出助手（C01–C06）

当前调用锚：`packages/reforge/src/index.ts:256–268/310–312` 导出脚本/帧播放接口；
`main.ts:179/181` 使用 host adapter/runner。只测输入确定的公开 step/result/tick，不进入主场景
E2E、实体碰撞与运行时战斗会话；相邻第一阶段实现只能作内容参考，不当二阶段架构真值。

| 组 | 源码对 | 待独立核旧测后的窄合同 |
|---|---|---|
| C01 | `script-runner.ts` + `script-runner-core.ts` | 当前条件/步骤返回、终止/等待与固定 tick；真实 runner，不手写执行模拟器。 |
| C02 | `script-host-adapter.ts` + `script-world.ts` | effect 分派的显式参数及当前页面/flow cursor 解析；不复活脚本写全局变量。 |
| C03 | `script-project-core.ts` + `runtime-script-project.ts` | 当前 shard/body/owner 的公开读取与缺失失败；不造旧 library fallback。 |
| C04 | `script-chunk-store.ts` + `dialog/dialog-box.ts` | 合法 chunk resolver 与对话槽显示/关闭状态，异步释放后无旧结果覆写。 |
| C05 | `dither-transition.ts` + `frame-animation-player.ts` | 手算像素访问/步进边界、真实小 TPFS 解块与帧时长；不冒称完整视频可播放。 |
| C06 | `entity-action-player.ts` + `world-motion-runtime.ts` | 显式 action binding/position 和有界时间推进；不选新走位/碰撞语义，不跑场景路线。 |

C 批只取一条固定小输入的 dialog/帧演出视觉。若某观察必须经 `main`/碰撞/E2E 才能证明，
登记未证交 Codex，不扩本卡。

## D · 迁移纯映射与诊断（D01–D06）

当前调用锚：`packages/migrate/src/migrate-content.ts:199/211` 使用事件翻译；
`packages/migrate/scripts/migrate-content.mts:23` 消费 transaction。禁止运行实际 migration CLI、
extract/bake/publish，不写正式 `data`/`projects`/baseline。需要 IO 的例子仅自有 `mkdtemp`。

| 组 | 源码对 | 待独立核旧测后的窄合同 |
|---|---|---|
| D01 | `translate-events.ts` + `translate-enemy-hook-flow.ts` | 合法原始 opcode/当前作者命令的独立输入→输出向量与拒绝上下文；不以翻译函数自造预期，不裁决原版机制。 |
| D02 | `pal-sprite-action-census.ts` + `sound-reference-audit.ts` | 当前精灵动作/音效引用的完整身份与缺失诊断，合成样本不称原版实测。 |
| D03 | `script-library-audit.ts` + `script-graph.ts` | current script roots/边/有序错误集合与输入保真；仅公开 audit，复杂全图执行另归 Codex。 |
| D04 | `migration-merge.ts` + `migration-plan.ts` | managed 文件合并/计划的纯结果、稳定顺序与单点冲突；不直接提交事务。 |
| D05 | `pal-authored-overlays.ts` + `scene-entry-normalize.ts` | 已存在 overlay 仅改目标、scene-entry ID 幂等与非目标保全；不增加新的剧情修补规则。 |
| D06 | `migration-transaction.ts` + `pal-migration-io.ts` | 自有目录里 journal/失败重试/显式源读取，逐文件 IO 轨迹和零污染；不读写真实 PAL 工程。 |

此批源缺口大但风险高。业务真值与第一阶段相冲突时停止该组，用 primary data/reference 与
最强替代解释交 Codex；不能因为审计红项多就选择迁移修复或改预期。

## E · 当前内容校验与项目读取（E01–E06）

当前调用锚：`packages/content/src/index.ts:197/199` 导出当前验证器；
`packages/reforge/src/main.ts:146/159` 消费当前项目 loader/save preflight。只消费 current
canonical 版本，旧开发期 upgrader/兼容 fallback 不作为测试目标。

| 组 | 源码对 | 待独立核旧测后的窄合同 |
|---|---|---|
| E01 | `content/validate.ts` + `validate-refs.ts` | 完整合法工程正控、单点破坏后精确 domain/owner/path 诊断；不只测 error 数量。 |
| E02 | `content/author-script-core.ts` + `script.ts` | 当前作者脚本 guard、嵌套 body/条件和 stable ID；不造已退役命令版本。 |
| E03 | `content/item.ts` + `asset.ts` | 当前 item/asset 的 kind/path/引用保真与合法小资源字段；不借旧格式升级求覆盖。 |
| E04 | `content/actor-condition.ts` + `validate-runtime.ts` | 当前状态/运行时投影边界；不推导新战斗数值或改变 gameplay 规则。 |
| E05 | `reforge/project-loader.ts` + `save/current-codec.ts` | 内存工程加载/场景读取、当前档 preflight/normalize 的精确结果和失败保真；不写真实档。 |
| E06 | `reforge/file-source.ts` + `fsa-source.ts` | HTTP/FSA 端口读取、取消/路径/JSON 错误与 URL 生命周期；无真实账号/项目写盘。 |

E 批结束时交 Codex 一份 5 批并集去重清单和可复建的局部 coverage 对照配置；GLM 不运行正式
ratchet/strict，也不把隔离分支或各批百分比直接相加为主线收益。

## 每组实施与验收纪律

1. 先读现行消费者、公开入口及同名/跨文件旧测试的**精确 title 与断言**。有新合同才建冻结目标对应
   `.glm-large-wave.test.ts(x)`；无新合同登记 `existing-proof`、不可达或未定政策并继续下一组。
2. 正控从当前构造器/guard/合法项目装载，负输入由同一合法输入单点篡改或公开 `unknown` 边界进入。
   禁止 `any`、`as never`、双强转、`@ts-ignore`/`@ts-expect-error`、mock 被证明的核心实现。
   端口替身只替 browser/FS/Audio/clock，明确它证明的协议；实际消费对象先深快照再调用。
3. 异步用 entered/deferred/完成轨迹，`finally` 释放并消费原 pending；不能用固定 sleep/timeout
   当取消或无迟到写入的证明。合法业务合同失败留本目录隔离红诊断，正确预期不改绿。
4. 每批选约 2–4 枚有鉴别力的单点业务反控，五批共用一套 judge：对照 exit0、针恰 exit1、
   绝对 test file/fullName、真实执行数、唯一注入命中、候选 AssertionError；timeout/混错/
   skip/零执行/exit2/null 均 invalid。判据自测调用同一 judge；loader/临时副本注入，产品 hash 不变。
5. 每批结束跑新增+相邻定向、相关包 typecheck、精确新增文件 Biome（error/warning/info 全零）、
   `node scripts/docs/check.mjs`、`git diff --check`；默认 maxWorkers 1–2，不与其它队列并发重门。
   只有 E 批完成后由 Codex 串行执行必要全包、统一 `pnpm check → coverage:ratchet →` 受保护单次
   `coverage:fast`。GLM 不写官方配置/基线或运行 E2E。
6. 每批 6 组全部完成就提交推送固定 SHA，回执从新鲜 Vitest JSON 生成 file/fullName/status 与数量，
   列每组旧证→新增差异、反控、视觉、未证/真缺陷；随后继续下一批，不等固定 AI 席位签字。
   Codex 独立接收，作者自验不能代替验收。

截图仅存 `/tmp/type-pal-glm-large-wave/`，回执附完整 SHA256、视口、URL、步骤、预期/实际、
console 错误；功能 UI 不触用户 6010、游戏 6005、reforge 6050 或 E2E 服务。无浏览器或没看图就标未证。
