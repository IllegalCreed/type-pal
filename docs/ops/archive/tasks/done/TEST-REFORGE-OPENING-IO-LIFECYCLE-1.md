# TEST-REFORGE-OPENING-IO-LIFECYCLE-1 — 标题读档IO与缩略图生命周期

Status: done
Owner: GLM（独立对话B，唯一写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: opening-menu / read-io / resource-ownership
Visual Verification Timing: dev-functional（有实际界面缺陷时登记最小复现，由Codex验收；不跑剧情）

## 目标与有限范围

用当前canonical存档和真实菜单入口核标题读档IO、在途返回、重复输入和ImageBitmap所有权，补无重复的正常合同，重新确认D-Q01-1及关联资源反例。不规定用例/反控数量或覆盖率涨幅；本轮没有产品修复授权。

| 轴 | 有限问题与输入 | 必须观察的合同或反例 |
|---|---|---|
| O1 | `listMeta()`在真实读档选择后拒绝 | 外层菜单Promise、未处理拒绝、后续键与rAF所有权；不要只断言一个Promise值 |
| O2 | 合法meta/payload/有效PNG已真实写入store，仅`getThumb()`外部IO拒绝 | 排除旧档/坏fixture解释；核是否由菜单承接拒绝，与O1区分故障位置 |
| O3 | 合法PNG交给`createImageBitmap`，仅真实可失败的解码边界拒绝 | 同上；区分浏览器解码失败与非法内容输入，不mock绘制/业务reducer |
| O4 | 读meta/缩略图在途时重复选择“读取进度”，两次IO逆序结束 | 是否多次读、旧结果覆盖新结果、重复位图泄漏；只做真实键操作，不访问phase/browser私有态 |
| O5 | 读档IO尚未完成，用真实键选新局使菜单返回，再释放旧IO | 晚到结果不能复活已退休菜单/监听/rAF；已创建及晚到位图去向，必要时交红反例 |
| O6 | 已进入load，Escape退回标题，再进入load | 上一批thumbnail所有权是否释放；普通Escape/翻页已有证明，不重复计新 |
| O7 | 正常选非空槽结束或选新局结束 | thumbnails与标题帧/键所有权的收尾；帧/键已证仅引用旧断言，位图释放独立核 |
| O8 | 合法meta而无thumbnail，或一槽有图一槽无图 | 实际选中slot与无图占位是否独立于解码顺序；先对照Q01/H2，不重复普通读档 |

逐轴标existing-proof/new-contract/product-counter/unreachable/blocked，给条件、caller、合法输入、旧file/fullName/断言及oracle。遇到产品缺陷停该轴实现，继续其它合法轴。全清单裁决即交付，不追加系统菜单、存档schema/迁移或剧情工作。

## 路由、冻结与白名单

- 工作树`/private/tmp/type-pal-reforge-opening-io`；分支`codex/glm-reforge-opening-io-r1`。
- 产品基点/冻结`2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`；从含本卡的派发提交开始，不更新产品基点。候选/回执SHA须核Git对象、docs-only尾巴单列。
- 可写：本卡你的交付块；新`packages/reforge/src/opening-menu.io-lifecycle.test.ts`、专属`packages/reforge/src/__tests__/opening-io-lifecycle/`；专属`docs/ops/evidence/TEST-REFORGE-OPENING-IO-LIFECYCLE-1/`。
- 旧测/共享runtime-shell fixture、`opening-menu.ts/main.ts/save/**`产品、schema、配置、依赖/锁文件、官方baseline、真实工程/档/PAL数据、共享文档全部只读。与对话C无共同写文件；反控在各自mkdtemp树，不修改活动工作树产品。
- **不得修D-Q01-1、选择错误提示/重试UI方案、加公共接口/取消协议。**原[产品卡](../../../tasks/REFORGE-OPENING-LOAD-ERROR-1.md)仍draft，本卡是测试与前提取证build，不是save/产品build准入。

## 前提真值与锚点

- 先读[READ-FIRST](../../../../phase2/READ-FIRST.md)、[测试质量验收](../../../agent-workflow.md)、产品卡与其原反例历史。不沿用旧SAVE版本fixture，当前`save/types.ts:8`为SAVE11。
- primary：`opening-menu.ts:99-163`的真实enterLoad、void调用与cleanup；`save/store.ts:116-139`的真实IndexedDB读取可拒绝；`main.ts`标题真实runOpeningMenu调用链。
- 替代解释：非法旧档/坏PNG/产品已经修复。用`buildCurrentSavePayload`、真实Memory/IndexedDbSaveStore、`putSlot`、有效PNG和直接源核对证伪；不要把伪Promise“拒绝”当所有浏览器API均合法。
- phase1机制/存档格式修改N/A：本卡不定义新格式、不改UX；现状→目标是取证与缺口测试，无产品行为变化。若拟修产品必须另走完整产品卡与前提/设计准入。
- 完整排重`opening-menu.test.ts`、`opening-menu.flows.test.ts`、`opening-menu.observation.test.ts`、`opening-menu.glm-q.test.ts`、`main.host-lifecycle-1.test.ts`相关标题入口断言。
- 可读复用`src/__tests__/runtime-shell/{dom-host,driver,project}.ts`；现有host记录绘制而非像素真解码，必须披露此限度。缺少真实位图/像素能力时不靠assert强转伪造，使用类型化宿主端口或明确blocked；不修改共享fixture。

| 冻结源 | SHA256 |
|---|---|
| `packages/reforge/src/opening-menu.ts` | `8f3dd8ab719487f82c0c37773f047d5f67500f7f2343c2335725408239012172` |
| `packages/reforge/src/save/store.ts` | `5c65c58e727bb688d602050ec388dbafde67939bea43134e6aa2ff10be4b27f6` |
| `packages/reforge/src/save/types.ts` | `856ba7ac63a7d0a314ac6189b4c2ec9b3e5c8130b03485e700a0ec38566f41bf` |
| `packages/reforge/src/main.ts` | `b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28` |

## 证据与验收

- 专属README+contract-ledger.tsv逐轴分类，不模板填账；新增合同一个it一个可证伪行为，无新合同允许零新test。输入完整typed，不unknown双桥、ignore、核心业务mock/私有state、新debug后门、扩timeout。
- 绿回归只接真实满足的合同。缺陷用`evidence/.../tools/`的按需隔离repro，在mkdtemp生成临时测试后调用真实产品，保存预期业务AssertionError/未处理拒绝、JSON/raw/退出码/signal/spawn/执行身份；默认suite不能留红、skip或“应当泄漏/未处理拒绝”绿测。隔离复现不是门禁通过。
- 新增绿合同选择最少有判别力的变异，三态完整执行集合相等且非空、单一指定业务红、恢复全绿、源码/测试/变异/恢复hash；拒收pending/todo/skip、collection/runtime/unhandled、signal/spawn失败，判据须有真实拒收自测。不以count或exit代替身份，不变证据不重采凑数。
- IO失败仅放公开存储/浏览器边界；使用临时合成工程/current payload，有效PNG。定向+相邻不按fullName筛选导致skip；保存JSON和stderr。finally处理自己的menu/监听/rAF/bitmap/stub，失败路径也核隔离清理，不全局prune。
- 最终一次`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`与`typecheck`、根`pnpm lint`完整零error/warning/info、`pnpm check:docs`、`git diff --check`；先跑基点对照，故意红repro与绿门分列。不压制act/console/error。
- 报告D-Q01-1是否仍成立、替代解释及精确调用链；资源问题独立反例独立建议，不代Codex批准修复。全树diff核白名单与冻结；只定位覆盖，不写官方基线。

## 当前模式推进记录

- 2026-10-06 Codex：O1–O8、合法存储拒绝及真实菜单入口已直接核；**build allowed仅限白名单测试与隔离前提诊断**；产品卡仍draft。
- 贡献者交付/自验：GLM r3 已交付（候选 HEAD `d676f5a684b623d95519ce3763474cbf168e4c24`）。Codex独立验收：r3 passed；done准入：待主分支 Git 集成与推送。
- 用户产品裁决：本卡N/A；任何错误提示/重试策略另交产品卡。

## 初始派发提示词（历史，当前以文末返工为准）

```text
你是TEST-REFORGE-OPENING-IO-LIFECYCLE-1唯一执行方。仅在/private/tmp/type-pal-reforge-opening-io、codex/glm-reforge-opening-io-r1工作。先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、docs/ops/tasks/TEST-REFORGE-OPENING-IO-LIFECYCLE-1.md和REFORGE-OPENING-LOAD-ERROR-1.md，再核卡内源码与旧断言。只裁决O1-O8，真实current存档/PNG/菜单入口，排重后补少而精的正常合同；D-Q01-1/竞态/位图缺陷交按需隔离真实红反例，不夹修产品、不让默认suite红或skip、不把缺陷写成绿预期。严格执行冻结/白名单/IO边界/三态身份与清理证明，完成门禁、完整SHA提交推送。所有轴有证据即停，只写本卡你的交付块；不合main、不done、不扩围。返回逐轴裁决、候选SHA、正常门禁与故意红反例分列，待Codex验收。
```

## Codex 独立三审记录（2026-10-07，r3）

候选分支 `codex/glm-reforge-opening-io-r1` HEAD `d676f5a684b623d95519ce3763474cbf168e4c24`，对应 r3 测试提交 `fcd7838fd9b9cce3f445a3a35c1eeb4ae89a3226`。独立核对 4/4 冻结源 hash、白名单与共享文件恢复；判据自测、真实 pure-red/afterAll hook/async uncaught 探针均按预期，3 针四态与末次重放通过，8 条诊断复现全通过且清理 `removed=true`。独立定向 3/3、typecheck 通过；根 lint 3537 文件 0/0/0、docs/diff 通过。O-R2-01 已闭合，候选可集成；D-Q01-1 产品卡仍不夹修。

## Codex 独立一审与有限返工（2026-10-07）

**counter，尚未集成。** 固定测试/证据提交 `97f4973eb82013232bc751b440a5b9b0cb4a1638`，含回执 HEAD `c774634332b8850ddc5635e11fdfd4e38ec5df0b`。本节代码行属候选；分支/远端一致、树干净。4/4 冻结源独立复算一致，产品与旧测未改；但存在两项共享文件越界。

独立复跑：在 Codex 独占临时复制树运行候选新文件，**4/4 passed、exit 0、pending/todo 0**。复制保持候选产品/测试字节，使用现有安装依赖，未运行作者无锁安装工具或写其活动树。这证明可执行，不证明错误 oracle 合法。全包/typecheck/lint/docs 作者回执保留为作者证据，本审因 counter 不重复重门。

| 编号 | 候选问题与独立证据 | 有限返工 |
|---|---|---|
| O-R1-01 | 新文件`:136-154` 要求重复输入产生两份 meta/thumb IO 和两张 bitmap；N1 把 single-flight 去重当“错误”注入。这不是已拍板业务合同，也与本包 R4 重复 IO/旧结果覆盖诊断矛盾。`:156-206` 把退出后仍解码一张位图写进绿断言，同时 R5b 指为缺陷。 | 删除这些坏行为绿 oracle，退役 N1 并注明原因。O4 只保留实际未重复的合法业务结果/所有权合同，否则改诊断或 existing-proof；O5 保留退休后结果、rAF/键/绘制稳定，证明 IO 已真实在途，不要求退出后继续解码。坏事实仅在诊断/隔离红反例中。 |
| O-R1-02 | O6 `:208-228` 只重复计 IO/位图与普通 Escape；没有证明重新进入消费的是新存档业务数据。 | 用真实 store 在两次访问间更新 current meta/合法数据，再核实际显示/选择的新数据；与旧 Escape 断言排重。无法构成净新合同则 existing-proof，不强保四例四针。O5 finally 即使中途失败也释放本次 gate，收妥菜单与 IO。 |
| O-R1-03 | 实际判据`:114` 查 `phase.identity.rowsList`，解析器`:420` 放的是 `phase.rowsList`，状态校验为空跑；红态只核 4 行、不比身份，末次绿与自己 hash 比较。独立调用同一源函数，**同数不同身份、红态隐藏 skipped、绿态隐藏 skipped** 三例均 `issues=[]` 被误收。 | 身份 hash 只含规范化 file×fullName 多重集合，status 分列；基线/红/恢复/末次与同一非空声明集合比较。查真实 rowsList，核逐行状态及所有计数、suite/JSON/raw harness 错误、signal/spawn；上述反例同判据自测必须拒收。保存相位 JSON 与 raw，不只 TSV/count。 |
| O-R1-04 | `tools/prepare-tree.mjs:15,40` 没复制 pnpm-lock，却用非 frozen install；“同 lockfile”叙述不实。copy/install 在函数返回前失败时，外层 finally 拿不到 tree。两 runner 在 cleanup 前写回执，缺最终删树证明。 | 复制现行 lock 与所需配置，frozen 安装或明确只读复用同图；禁止重新解析依赖图。准备函数内部失败清理，外层 finally 精确清本次树后记录实际 cleanup 证明和失败路径。复核冻结，不改配置/锁。 |
| O-R1-05 | diff 越界：`docs/ops/evidence/README.md` 与 `docs/phase-governance/reviews/20261004-semantic-current-batch.json`。作者改 Codex review pin 不构成独立审核。 | 将两文件恢复到派发 `a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8` 字节。共享导航/审核 pin 由 Codex 集成时处理，贡献者 docs 门仅允许精确登记自身证据缺导航这一项，不新增 ignore/豁免。 |

O-R1-03 同时覆盖诊断 runner：独立调用 `tools/run-repros.mjs:513` 的实际 `validateTypeB`，错误 fullName 加额外零 assertion 的 collection failed suite仍 `issues=[]`。需核**每条诊断预先声明的执行身份与错误形状**，不能只看一个 failed 计数/消息片段。Type A 是故意证明公开 IO 的指定未处理拒绝：保留其业务单例全绿、恰一指定产品拒绝的独立判据，不能套普通反控“无 unhandled”规则抹掉这个缺陷，也不能容忍额外 harness/runtime 错误。旧相位材料不变时可以重新审判，不要求八条业务全部重跑。

O1–O8 不扩围。保留原公开存储、合法 PNG、IO 拒绝与已有八个产品诊断，不因普通错误绿断言失败就重造全部反例；诊断的原相位材料不变可沿用，工具真实性/cleanup 仍须闭合。移除 N1 的错误可执行注入，历史仅留退役身份/原因，不再计有效。最终按新合法合同选择最少针，变化的最终执行集/测试 hash 必须真实重采，原卡全包与零诊断门保留。`REFORGE-OPENING-LOAD-ERROR-1` 仍 draft，不夹修产品或决定错误 UX。

本次**审核记录**门已独立通过：`pnpm check:docs`（全部子门）、`pnpm lint`（3474 文件、0 error/warning/info）及 `git diff --check`；不是候选产品测试包 accept。

### 下一位 Agent 提示词（r2，人工选 GLM-5.3）

```text
你是 TEST-REFORGE-OPENING-IO-LIFECYCLE-1 原 Owner，只在 /private/tmp/type-pal-reforge-opening-io、codex/glm-reforge-opening-io-r1。git fetch origin 后只读 git show origin/main:docs/ops/tasks/TEST-REFORGE-OPENING-IO-LIFECYCLE-1.md 的 2026-10-07 Codex 一审，不rebase漂移产品。r1 HEAD c774634332b8850ddc5635e11fdfd4e38ec5df0b，原冻结/白名单/O1-O8不变。一次闭合 O-R1-01～05：移除绿测中两份重复IO/退出后继续解码等缺陷预期、删除错误可执行N1，历史只留退役身份原因；O5保留真实在途及退休业务稳定并 finally 释放gate；O6 用真实store更新后可见新数据证明刷新，或据旧证排重，不用IO数量凑合同；修正rowsList层级、身份与status分离、四相位同一非空完整file/fullName多重集合，拒收隐藏skip/换身份/harness与signal/spawn并自测；诊断runner也核每条精确身份与错误形状，TypeA保留恰一指定公开IO未处理拒绝、拒收额外错误；保留真实相位JSON/raw/hash；隔离树复制lock/frozen依赖图，准备失败及最终清理实际举证；恢复两项越界共享文件到派发 a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8。保留合法IO缺陷诊断，不修产品/旧测/配置/共享文档。只重采受影响证据，重算合法合同账，不强保四例四针。完成原卡定向相邻/全包/typecheck/零诊断/docs/diff，docs仅登记自己目录缺共享导航这一项；只写自己的交付块，完整SHA提交推送，不合main、不done、不扩围，等待二审。
```

## Codex 独立二审与最后判据窄返工（2026-10-07）

**counter，仅剩 O-R2-01；未集成。** 固定 r2 工作提交 `e04007b159e91b01b15ced4084d6e05f10fbba15`、含回执 HEAD `89dbb9a6f74b202b2fd514ba2de785d631b912b8`；尾巴仅本卡贡献者回执。分支/远端一致、树干净；4/4 冻结源独立复算相同。两项共享文件已逐字恢复到派发 `a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8`；最终 diff 白名单成立。

已核关闭：O-R1-01 的重复IO/退出后继续解码坏绿oracle删除与N1退役；O-R1-02 的O5真实在途/业务退休/finally、O6真实store更新后实际显示新港且无旧港；O-R1-04 的frozen lock与准备/最终清理；O-R1-05 的两共享文件恢复。O-R1-03 的rowsList位置/完整身份/隐藏状态/额外零断言suite已修，但额外运行错误仍会误收，以下不是新增测试范围。

Codex 独占复制树保持候选产品/新测字节，独立运行原反控工具：整文件3/3基线与恢复、三针业务指定单红、末次3/3、工具exit0；原诊断工具八条产品反例按其判据8/8、清理成立。D-Q01-1与其它已报缺陷方向保留，不把这个工具返回0当严格门已通过。作者全包/typecheck/lint/docs保留为作者证据，本审因决定性counter不重复重门。

| 编号 | 实际反例与源码锚点（该候选） | 最后有限改动 |
|---|---|---|
| O-R2-01 | `run-counterproof.mjs:115-120` 只拒零断言failed suite，解析器丢掉suite.message；`:171` 只搜索Unhandled Rejection。独立实际Vitest三例（两绿一指定AssertionError红）+ `afterAll` 抛Error，报告total3/pass2/fail1、suite.message非空；实际 `validateRedPhase` 返回 `[]`。异步uncaught原始默认reporter明确报 `Errors 1 error / Uncaught Exception / CODEX_EXTRA_RUNTIME_ERROR`，仍返回 `[]`。`run-repros.mjs:543-566` 实际 `validateTypeB` 对一例目标红叠同样两种错误也返回 `issues=[]`。 | 保留并核suite.message、所有逐行/计数、唯一纯业务AssertionError、同次子进程完整原始诊断。统一拒收额外hook/runtime/global错误，不仅拒Unhandled Rejection；这两种真实Vitest反例入同判据自测，纯红仍接受。TypeA故意指定产品拒绝独立保留，但也不能叠加其它错误。 |

最小探针与实际结果：指定 `expect(1).toBe(0)` 红（反控再加两例独立passed以保持三行），分别追加 `afterAll(() => { throw new Error('CODEX_EXTRA_HOOK_ERROR') })` 或 `afterAll(async () => { setTimeout(() => { throw new Error('CODEX_EXTRA_RUNTIME_ERROR') },0); await new Promise(resolve => setTimeout(resolve,30)) })`。JSON+默认reporter实跑均exit1；身份、单目标红保持，额外hook/global错误真实出现，但上述两个候选判据都接受。不是手工伪造计数，也不是产品缺陷针。

JSON reporter单独运行隐藏全局异常详情；若JSON和console分开两次运行，不能据后一进程的健康断言前一进程无额外错误。每相位同次native JSON+完整原始诊断联判（双reporter或等价方法），不要求raw逐字重印全部fullName。现有材料足以严格重判的保留；缺少该次诊断的相位重采，业务针与八项产品诊断不新增、不重造。产品卡仍draft，不夹修。

本次**审核记录**质量门独立通过：`pnpm check:docs` 全部子门、根 `pnpm lint`（3474 文件，0 error/warning/info）、`git diff --check`。仅审核文档收口，非候选统一质量门或集成 accept。

### 下一位 Agent 提示词（r3，人工选 GLM-5.3）

```text
你是 TEST-REFORGE-OPENING-IO-LIFECYCLE-1 原 Owner，继续 /private/tmp/type-pal-reforge-opening-io、codex/glm-reforge-opening-io-r1。先 git fetch origin，只读 origin/main 本卡最新二审，不rebase漂移产品。r2 HEAD 89dbb9a6f74b202b2fd514ba2de785d631b912b8。原冻结/白名单/O1-O8不变；缺陷绿预期/N1退役、O5在途与收尾/O6真实store刷新、锁与清理、越界恢复已核关闭，不重开、不增正常测试。只修 O-R2-01：反控解析器保留suite.message并由唯一判据拒收目标AssertionError之外的hook/runtime/collection/Uncaught Exception/Unhandled Errors等错误，诊断TypeB同步；逐相位同时核完整JSON身份/状态/所有计数及纯单一AssertionError。实际Vitest“目标单红+afterAll抛Error”和“目标单红+异步uncaught”必须拒收，纯业务红须接受。不能只搜Unhandled Rejection；JSON单reporter看不到全局错误，采集同次子进程native JSON+完整诊断（可双reporter）避免两个进程互证遗漏。TypeA仍保留恰一指定公开IO未处理拒绝的独立真值，但拒收额外hook/runtime错误，别把TypeA改成零unhandled。保留八个产品缺陷方向及三枚业务针，材料足以严判的只重判，诊断采集不足的才重采；不重造业务合同。mkdtemp/frozen lock/finally保持。按卡完成定向相邻/全包/typecheck、lint格式0/0/0、docs/diff；只允许原缺共享导航项，不写共享文档。完整SHA提交推送、docs-only单列，不合main、不done、不修产品、不扩围，待Codex终审。
```
