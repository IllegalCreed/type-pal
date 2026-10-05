# TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 · 排重账（existing-proof ledger）

基线：`origin/main` = `53bf97e01`（fresh worktree `codex/glm-editor-persistence-recovery-r1`）。
方法：先由只读探索代理对 42 个家族测试文件产出 fullName×caller×input×oracle 逐条清点（约 900+
用例），再对本卡五族源文件跑 v8 分支覆盖率（家族测试子集一轮、全 46 家族文件一轮、全仓测试套一轮），
对每个"疑似缺口臂"逐一回查全测试语料。本账只登记**已有真实证明**的轴；疑似缺口在
「候选解剖」节给出为何不构成缺口的证据。

## 一、五族 × 卡面轴的 existing-proof 矩阵

| 卡面轴 | 已有证明（文件 · 代表 fullName/行号） |
| --- | --- |
| read/open admission 拒绝 | `project-read-admission.test.ts`（29 例：试玩/ZIP/finishOpen 的 pending、损坏、换代、无凭据、锁内绑定漂移）；`author-project-check.test.ts:211-258`（pending 先于一切作者读）；`open-local.test.ts`（contentVersion 门）；`save-batch-open.test.ts` O1/O2/O3 |
| 序列化 round-trip / manifest identity | `project-serialization-boundaries.test.ts`（9 例全族）；`project-io.test.ts`（shop round-trip/投影/键序/入口）；`project-io.glm-p.test.ts` P01-G01/G02；`zip.test.ts`（字节级 + 两次打包全等） |
| save receipt（prepared/committed/cursor） | `author-save-journal.test.ts`（79 例：IDB 五相位、cursor 前缀、applying+issued）；`author-save-store.test.ts`（37 例：2049 条目逐相位校验、complete-才-提交、同目录多 identity 拒） |
| plan/prefix 纯核 | `author-save-plan.test.ts`（49 例：round-trip、prefix 派生、traversal/别名/稀疏 steps 拒）；`author-save-prefix.test.ts`（18 例：idle/issued 收敛、空 create 占位仅限 issued 新写、外来字节/未来目标/坏 cursor 拒） |
| journal 恢复（partial write → prefix 续跑） | `author-save-journal.test.ts`：`a crash between a step IO and its cursor commit resumes exactly from the durable prefix`、`replay survives two successive interruptions at different steps`、`the unique issued step found at its exact after value is a legal state…`、`resolves interrupted marker publication {pending-before\|committed-before\|committed-after}` |
| 外部漂移（stale writer 拒） | `author-save-conflict.test.ts`（37 例：stale writer 拒+磁盘保留新值、打开/授权/写集三段漂移拒、锁内复验）；`author-save-journal.test.ts`（staged blob/plan/generation/marker 变化停准备或停重放）；`pal-save-identity.test.ts`（13 例 PAL 指纹漂移零写拒） |
| 权限失败 | `project-io-admission.test.ts:168-207`（catalog NotAllowedError 传播+零写）；`project-read-admission.test.ts`（NotReadable/NotAllowed/Abort ≠ NotFound）；`save-batch-open.test.ts` O2（picker NotAllowedError 上抛） |
| 锁（冲突/retry/release） | `save-batch-storage.test.ts` S4/C4a/C4b（发现锁→workspace 锁顺序、注册锁互斥/异常释放）；`project-read-admission.test.ts`（读锁持有/释放/绑定消失前置拒）；`author-save-journal.test.ts:1292-1314`（同 scope 递归锁拒）；`project-copy.test.ts:327-349`（另存为只申请目标 W 锁） |
| history 跨 participant 原子性 | `editor-history-coordinator.test.ts:120-152`（第二笔 dispatch 抛错沉默恢复第一笔、redo 不可复活半状态）；`editor-history-timeline.test.ts`（apply/inverse/redo 三向失败双侧精确保持）；`editor-history-paired-workflows.test.ts` P16 |
| redo 分支清理 | `editor-history-timeline.test.ts`（main/script 任一侧新分支立即弃双侧 redo、asymmetric mixed futures、显式 discardRedo 只认原命令）；paired-workflows P13/P14/P15（no-op 不清） |
| observer 隔离/失败 | `editor-history-timeline.test.ts:316-331`（observer throw 不回滚已提交 pair、不对其他 observer 隐瞒）；paired-workflows P17；`editor-history-foundations.test.ts:39-67`（失败零通知） |
| markSaved/hydrate 非事务边界 | `editor-history-timeline.test.ts`（markSaved/hydrate 不递增 historyVersion、toolbar snapshot 不变）；paired-workflows P18；`edit-session.test.ts`（hydrate 不进 undo 不置脏、map revision 语义） |
| copy traversal/别名/源漂移 | `author-save-plan.test.ts:110-160`（`../escape`、`/root`、`.type-pal` 别名拒）；`fsa-copy.test.ts`（`.TYPE-PAL/` 排除、清单/字节双 verify 职责分离）；`project-copy.test.ts`（17 例：封存前源变化拒零作者覆盖、整笔复制授权边界）；`open-actions.test.ts`（另存为拒源子目录/identity namespace） |
| export 资源 hash/size/type、空目录、取消 | `zip.test.ts:192-306`（tileset/battle-sprite 闭包四类拒、save-recovery 子树不入包、两次打包字节全等）；`project-transfer-validation.test.ts`（克隆三拒 + 导出三拒全带 0 click 0 download + 源目录零写删）；`project-read-admission.test.ts` SR-10/11/12 |
| 零写/零下载 | `project-transfer-validation.test.ts:185-197`（assertExportRejects 三件套）；`project-read-admission.test.ts`（多处 clicks==0 && downloads==0）；`project-io-admission.test.ts`（expectNoAuthorIO）；`save-batch-policy.test.ts` P2；journal 全文 `authorChanges()==空` 惯例 |

## 二、卡面四个代表场景的既有证明

| 卡面场景 | 证明 |
| --- | --- |
| 写到一半断电后只从已验证 prefix 恢复 | journal `a crash between a step IO and its cursor commit resumes exactly from the durable prefix` + `replay survives two successive interruptions` + prefix 纯核 18 例 |
| 外部文件漂移拒绝 stale writer | conflict `cooperative concurrent saves serialize, then reject the stale writer` 等 10+ 例；journal prepared 阶段漂移 4 例 |
| 配对命令失败不发布半状态 | coordinator/timeline `second apply failure publishes nothing and preserves both domains exactly`、P16/P17 |
| 导出坏资源零下载 | transfer-validation `克隆资源长度与 catalog 不符：拒绝、零作者写入` / `manifest 缺 assets.catalog…0 click 0 download` / `空目录：拒绝导出、零下载、零写删` |

## 三、候选解剖（疑似缺口 → 已有证明，故不新增）

### 候选 A：首存 pending 门「创建成功但未写入」的 0 字节 save-state 占位恢复

- 疑点来源：`author-save-journal.ts:516`（`bytes?.byteLength === 0 && phase==='ready' && previousState==='null'` → 按 previous 分类）。
- 解剖：journal 测试 fixture 由 `buildBlankProject` + `memoryAuthorDirectory` 构成，**不携带** `.type-pal/save-state.json`（`seed.ts` 无该输出；已核），即 `previousState==='null'` 的首存形态。
  `resolves interrupted marker publication pending-before` 恰在 receipt phase `ready` 时对
  `PROJECT_SAVE_STATE_PATH` 注入 `beforeClose` 失败 —— 内存 FSA 的 `getFileHandle({create:true})`
  已落下 0 字节占位、`close()` 在 `files.set` 之前抛错，磁盘留下 0 字节状态文件；随后
  `recoverInterruptedAuthorSave` 复原并 `assertRestored`。若 L516 分类不生效，恢复会在
  `JSON.parse('')` 处抛 SyntaxError 而失败——测试通过即证明该路径生效。单独复跑该测试
  （`-t 'resolves interrupted marker publication'`）并按 `b` 的对象形态正确取计数：
  L516 if 组 `[1,57]`——真分支恰命中 1 次（pending-before 变体），假分支 57 次。
- 结论：已有证明，不新增。

### 候选 D：世界精灵（`kind:'sprite'`）资源经 ZIP 导出管线

- 疑点来源：导出族测试断言文本只见 tileset/battle-sprite，疑 sprite 记录从未走过导出管线。
- 解剖：`buildBlankProject` 经 `buildSeedAssets` 自带三类生成资产（`seed.ts:75-90`），其中
  `sprite.generated.starter`（kind `sprite`，真实 gzip/RLE 字节）登记进 catalog。
  `project-transfer-validation.test.ts` 的「导出正控」导出的正是**整个 blank 项目目录**，因此
  sprite 记录已完整走过 collect → `validateProjectZipEntries`（逐记录 bytes/sha256 校验，含 sprite）→
  buildZip → 下载；`zip.test.ts` 另有 roundtrip/防 extracted 双副本合同。对 sprite 记录单独再加
  「字节逐份保留」断言与 tileset 正控同 caller 同 oracle，属换包装。
- 结论：已有证明，不新增。

### 真实 0 计数臂清单与分类（v8 臂级口径）

`branch-inventory.json`（家族口径，158 臂 / 12 文件）与 `coverage-fullsuite.json`
（全仓口径附录）给出机器清单；v8 对 if/`&&`/`?:` 的臂序无稳定语义，故分类以
「该行条件对应的业务案例是否有具名既有测试」为准。代表项：

| 臂（源行） | 分类 | 依据 |
| --- | --- | --- |
| `author-save-journal.ts:198/219/261/346/423`（binding 漂移、planHash 未封存、operationId 不符、pending 前态、staged blob 漂移 throw） | 既有测试已证 throw 案例 | journal `copied pending metadata…`、`staging failure…`、`a pending save cannot be replaced…`、`a staged blob changed after close…`（臂 0 为条件另一侧/臂序伪影） |
| `author-save-journal.ts:690/691/715`（cleanup 相位分支与警告文案） | 既有测试已证 | `committed cleanup failure is nonfatal…`、`staging failure … safely cleaned`、`a changed private payload is not erased…`（0 臂为 `String(cause)` 等消息格式子臂） |
| `author-save-journal.ts:553`（重放已应用 write 步的 `hooks.applied` 三元，家族口径双 0） | 家族外已证/防御 | 重放循环由 own-retry 家族经 `use-editor-project-session` 转译 harness 触发（conflict 文件），全仓口径附录见残余 |
| `editor-history-coordinator.ts:33`（assertSessions 不匹配 throw） | 防御层 | 仅 Root 装配错线可达；与 kimi 波「不为触达伪造非法状态」裁定同类 |
| `editor-history-coordinator.ts:158/166`（配对 no-op 双侧 throw 的臂细节） | 既有测试已证 | foundations `paired dispatch rejects a script no-op…`（`未修改脚本`）；对侧对称臂同构 |
| `editor-history-coordinator.ts:202`（discardFuture 空栈早退） | 防御层 | coordinator 的 discardRedo 只在 session 报告 redo 命令在场时路由；空栈形态仅独立 session 已证（edit-session `noop` 案） |
| `export-zip.ts:51`（battle-sprite 拒绝消息的非 Error cause 子臂） | 消息格式子臂 | zip `battle-sprite … 拒绝缺失/篡改/非 canonical` 已证 throw 本体 |
| `project-copy-source.ts:31/64`、`author-disk-baseline.ts:80`（观察器 null-再读良性臂 / 非 NotFound 重抛） | 良性回退/IO 注入子臂 | `复制源各读取接口共享字节证据…`、`B1: 载入捕获期间…拒绝` 已证拒绝案例 |
| `open-actions.ts:182`（PAL 打开缺 proof throw） | 防御层 | 合法流程中 proof 先于该点捕获；O5/O6 证 proof 在场与变化两向 |
| `open-actions.ts:293`（另存为缺源证据 throw） | 既有测试已证 | save-as-boundaries `缺源证据 local/source-only 拒（另存为缺少源项目基线）` |
| `author-save-plan.ts:165`（恢复路径文件/目录冲突 throw 臂） | 既有测试已证 | plan `rejects sparse steps, file/directory aliases, missing and uncreated parents` |
| `file-system-access.ts:18`（无端口 localhost URL 子臂） | 微小子臂 | `classifyDirectoryPicker 非法 URL 回退臂`（editor-asset-io.glm-p）已证同函数主路径；无端口形态零业务判别值 |
| `edit-session.ts`（61 臂，map 引用/stamp 事实/LRU 深处子臂）、`project-io.ts`/`project-diagnostics.ts`/`workspace-persistence.ts` 剩余 | 跨文件已证或防御/环境臂 | 全仓口径附录（`coverage-fullsuite.json`）给出整套消除跨文件已证臂后的残余；逐臂具名分类同上原则 |

所有 19 个范围源文件在**仅家族测试**下分支覆盖 83–100%（`coverage-family.json`，vitest 官方
summary 口径）；其中 `edit-session.ts` 的低点来自 UI 侧 harness 触达的臂（全仓口径回到 87%+）。
若 Codex 对任一行号判定为真实业务缺口，按 README「反控申报」节流程返工补合同。

## 四、排重结论

1. 卡面五族（admission/serialization、receipt/prefix/recovery/lock、partial write/foreign drift、
   history paired atomicity/redo branch、copy/export zero-write/zero-download）在每个轴上均有
   多条带精确 oracle 的既有合同；四个代表场景全部有具名证明。
2. 深挖出的两个候选（0 字节 save-state 占位、sprite 资源导出）经解剖均已有证明。
3. 按 AGENTS.md（2026-10-03 测试少而精）与本卡 Draft（"若一族已饱和，只写 existing-proof，不新增
   包装测试"），本轮**不新增包装测试**；未闭合项移交 Codex 复核（见 README「未闭合风险」）。
