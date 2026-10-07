# TEST-REFORGE-OPENING-IO-LIFECYCLE-1 排重账（GLM r2）

对照面 = 卡面点名的五文件标题入口断言 + save 存储边界族。逐轴先排重，再决定
new-contract / existing-proof / product-counter；不重复普通读档、普通 Esc/翻页与
音乐生命周期。r2 按 Codex 一审 O-R1-01/02 重铸：删除把产品缺陷写成绿预期的
O4 合同与 O5/O6 的 IO/位图计数断言，O6 改为真实 store 更新后的新数据消费证明。

## 已证面（不重复计新）

| 面 | 证据锚点 | 结论 |
|---|---|---|
| 选定/开局完成时帧键收尾、黑屏 cleanup | `packages/reforge/src/opening-menu.flows.test.ts:92-118`（H2 完成时 frames.size=0、后键零绘制、reads=[]） | O7 帧/键收尾 existing-proof |
| 空档 Esc 回退后仍可开局 | `opening-menu.flows.test.ts:120-137` | O6 的「Esc 退回」子面已证；重进消费新数据未证 → r2 G4' |
| 跨页真实读档 + 缩略图读取（单次进入） | `opening-menu.flows.test.ts:139-169`（reads=['meta','thumb:m02']、resolve m02） | r2 起 O4 单次正常读档归此 existing-proof（r1 的"重复输入=双份 IO"绿合同按 O-R1-01 删除） |
| 观察快照流/不可变性/load 相位暴露 | `opening-menu.observation.test.ts:13-73` | 快照面已证；本卡仅作相位 oracle 复用 |
| 菜单相位未处理键不拦、环绕、读档相位键臂、ArrowLeft 首页钳制 | `opening-menu.glm-q.test.ts:86-138`（Q01） | 键臂已证；不重复 |
| 单次进入读档逐槽恰读一次（多帧不重读） | `opening-menu.glm-q.test.ts:140-175`（Q01） | 读放大维度全部归诊断面（R4），不再立绿合同 |
| 标题读档端到端开局（main.ts ?menu 全链） | `main.host-lifecycle-1.test.ts:189-216` | boot 级已证；本卡不在 boot 层重复 |
| 菜单音乐生命周期/异常退出停曲 | `opening-menu.test.ts:4-41` | 与 IO 生命周期正交，不碰 |
| 存储边界读写/隔离/ops | `src/save/store.test.ts`、`store.isolation.test.ts`、`ops.test.ts`、`browser-state.test.ts` | store 层合同已证；本卡只在菜单消费侧 |
| IO 拒绝悬空（D-Q01-1 原诊断） | 产品卡 `REFORGE-OPENING-LOAD-ERROR-1.md`（content20/SAVE8 时代） | 当时形状；本卡按当前 SAVE11/main 以 R1/R2/R3/R5a 重核仍成立 |

## 新增绿合同（r2 净留 3，一个 it 一个可证伪行为）

| 合同 | 载体 | caller/合法输入 | oracle | 与已证面的判别 |
|---|---|---|---|---|
| G2 O5 在途退出后迟到 IO 不复活 | `opening-menu.io-lifecycle.test.ts:138-200` | 公开 `runOpeningMenu` + 真实 MemorySaveStore + buildCurrentSavePayload/SAVE11 + 有效 PNG + 公开 SaveStore 边界门控 listMeta 送达 | 在途自证（门控下达前 reads=['meta']）→ 退出 resolve {new,first}、frames=0 → 迟到送达（wrapper 送达标记 delivered=['meta']，场景自证非产品资源断言）后 frames 仍 0、绘制数不变、结果不变；finally 幂等释放 gate+settle+收妥菜单 | H2 钉「完成时收尾」无在途 IO；G2 有真实在途且证明其送达，不复活退休菜单；退出后是否继续解码不设绿断言（归 R5b 诊断） |
| G4' O6 重进消费新数据 | `opening-menu.io-lifecycle.test.ts:202-227` | 真实键 Esc 退回 + 真实 store 经产品 putSlot 更新 meta（旧港→新港/新时间，payload 不变） | 重进后迟到帧文本含新港不含旧港，仍完成 {load,m01} | flows 的 Esc 测试止于「退回后开局」；Q01 逐槽恰读一次不涉数据更新；r1 的 IO/位图计数断言按 O-R1-02 删除，oracle 只看可见新数据 |
| G3 O8 有图/无图槽并存 | `opening-menu.io-lifecycle.test.ts:229-284` | 真实 IndexedDbSaveStore（fake-indexeddb 宿主）+ 公开边界合法值 getThumb→null | 无图槽 meta 文案渲染、有图槽 drawImage(thumb)、选无图槽 resolve {load,m01} | 既有读档测试全部有图；无图占位/选档独立解码未证 |

## r1→r2 变更账（Codex 一审 O-R1-01/02）

| 项 | r1 | r2 |
|---|---|---|
| O4 绿合同（重复输入双 IO/双位图） | `io-lifecycle.test.ts:136-154` 存在 | 删除（把缺陷写成绿预期，与 R4 诊断矛盾）；O4=existing-proof(H2)+product-counter(R4) |
| O5 退出后解码断言 | `thumbBitmaps()==1` 写进绿 | 删除；迟到送达改由 wrapper `delivered` 标记自证（场景前置，非产品行为断言） |
| O5 清理 | 仅 finish() | finally 幂等释放 gate + settle + 有界真实键收妥未决菜单（失败路径不留悬挂 IO/菜单） |
| O6 oracle | reads 四条+位图 2 张 | 可见新数据（迟到帧含新港不含旧港）+完成读档；计数断言全删 |
| N1 注入 | 可执行针 | 退役（counterproof.json `retiredInjections` 留身份/原因），有效针 3 枚 |

## 登记不设绿针的缺陷面（按卡交隔离红反例，不写绿预期）

| 反例 | 轴 | 缺陷内容 | 建议去向 |
|---|---|---|---|
| R1/R2/R3/R5a | O1/O2/O3/O5 | `void enterLoad()` 不承接任何存储/解码拒绝：业务全绿 + 恰一指定产品未处理拒绝 + exit 1（json success=true 不可信） | 产品卡 REFORGE-OPENING-LOAD-ERROR-1（仍 draft）；错误提示/重试策略归产品裁决 |
| R4 | O4 | 重复选择产生双份 IO；两读逆序完成时旧 metas 覆盖新批次（迟到旧结果胜出）；重复位图无主 | 同上（在途读的取消/所有权归属未决） |
| R5b | O5 | 退出后迟到 IO 仍创建位图（无消费者） | 同上（退出应取消在途装载） |
| R6/R7 | O6/O7 | 缩略图位图退役（重进 clear）/完成收尾均不 close，释放完全依赖 GC | 同上（释放方案待独立设计，本卡不代批） |

## 判例

- vitest 4.1.7 定向不得用 `-t` 过滤：未匹配测试计为 pending（卡面拒收 skip 形态）；
  定向=整文件，针变异须外科级只红目标合同。
- 未处理拒绝下 JSON reporter `success` 仍为 `true` 且无 unhandledErrors 字段——
  Type A 判据必须组合 exit=1 + 默认 reporter stderr（恰一注入标记 + 产品栈锚
  `opening-menu.ts` + 恰一 `Errors  1 error` 摘要行）；拒绝报告只在 stderr，
  stdout 只有摘要（合成自测须同构，否则重复计数）。
- 隔离 repro 里注入的错误必须在 enterLoad 异步链上构造，否则未处理拒绝栈只含
  repro 帧、无产品锚。
- repro 的 seed 必须在 `installShellHost` 之后（shellProject 的 compressGzip 需要
  host 提供的 Node Blob/Response 全局）。
- 观察快照只在帧上刷新：纯 settle（宏任务）后断言 phase 前必须补一帧。
- r2 判据修正（O-R1-03）：identity.rowsList 层级、身份哈希只含 file×fullName
  多重集合、四相位与同一声明集合比较、行级 failed 与 identity.failedRows 交叉
  取消息（否则消息校验空跑——自测 `non-assertion-error-reject` 实证捕获）。
- r3 判据修正（O-R2-01）：每相位/每条 repro 必须同一次子进程双 reporter
  （`--reporter=json --reporter=default --outputFile.json`）联判——JSON 单跑隐藏
  全局错误、JSON 与 console 分进程互证无效；解析器保留 `suite.message`（afterAll
  throw 实测落此字段）；污染检测覆盖 Failed Suites/Uncaught Exception/Unhandled
  Errors 段/Errors N 摘要行，不能只搜 Unhandled Rejection（异步 uncaught 实测只
  在默认 reporter）；Type A 保留恰一指定拒绝但拒叠加错误。真实 Vitest 污染探针
  （纯红/afterAll throw/异步 uncaught）在同一树经同一管线实跑自检。
- 隔离树复制 `pnpm-lock.yaml` + `--frozen-lockfile`（r1 无 lock 的 prefer-offline
  安装叙述不实）；安装后逐字节比对 lock 未改写。
