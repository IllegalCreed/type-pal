# TEST-REFORGE-OPENING-IO-LIFECYCLE-1 交付证据（GLM r3，已集成 main）

分支 `codex/glm-reforge-opening-io-r1`，产品基点/冻结 `2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`。
r3 一次闭合 Codex 二审 O-R2-01（r2 已闭合一审 O-R1-01～05）；产品/schema/API/
旧测/共享 fixture/配置/锁文件/baseline/真实数据零改动，两项越界共享文件已恢复至
派发 `a2447b5c9` 字节（evidence 导航与 content-review pin 已由 Codex 收口）。

## r3 变更概览（相对 r2 工作提交 `e04007b15`，仅判据窄返工 O-R2-01）

- 两 runner 每相位/每条 repro 改为**同一次子进程**双 reporter 联判
  （`--reporter=json --reporter=default --outputFile.json=<evidence>`）：native JSON
  （身份/状态/计数/suite.message）与完整原始诊断（stdout+stderr）同进程采集——
  JSON 单跑隐藏全局错误、JSON 与 console 分进程互证无效（二审实证）。
- 解析器保留并核 `suite.message`：任何非空即拒收（afterAll/hook 错误实测落此字段，
  二审反例 CODEX_EXTRA_HOOK_ERROR）。
- 污染检测不再只搜 Unhandled Rejection：`Failed Suites`、`Uncaught Exception`、
  `Unhandled Errors` 段、stdout `Errors  N` 摘要行——业务相位（baseline/mutant/
  restored/final 与全部 Type B）任一出现即拒收；Type A 保留恰一指定公开 IO 未处理
  拒绝，但叠加 Uncaught Exception/hook 错误即拒收（异步 uncaught 实测只出现在默认
  reporter、json 全隐藏）。
- **真实形态自检**：二审两例真实 Vitest 污染探针（2 绿+1 指定 AssertionError 红，
  叠加 afterAll throw / 异步 uncaught）+ 纯红探针，在同一 mkdtemp 树经同一
  dualPhase+validateRedPhase 管线实跑并入回执——纯红接受、两种污染按正确理由拒收；
  合成自测扩至反控 20 例 / repro 19 例（含两种真实污染形态合成镜像）。
- 采集不足的相位全部重采（同进程配对是新材料要求）：反控四相位 ×3 针 + 末次、
  8 条 repro 全部重跑；三针与八项产品诊断不新增、不重造，业务测试文件零改动。

## r2 变更概览（相对 r1 工作提交 `97f4973eb`）

- **O-R1-01**：删除 r1 的 O4「重复输入=双份 meta/thumb IO+两张位图」绿合同与
  O5 的「退出后仍解码一张位图」绿断言（把产品缺陷写成绿预期）；O4 改判
  existing-proof（flows H2 单次读档）+ product-counter（R4）；N1 注入退役
  （`counterproof.json retiredInjections` 留身份/原因，不再执行）。
- **O-R1-02**：O5 保留在途自证（门控下达前 `reads=['meta']`）+ 退休业务稳定
  （迟到送达后 frames/绘制/结果不变），迟到到达改由 wrapper `delivered` 标记自证，
  不要求退出后继续解码；finally 幂等释放 gate、settle 在途 IO、真实键收妥未决菜单。
  O6 重铸为真实 store 经产品 `putSlot` 更新（旧港→新港）后重进消费新数据的证明，
  IO/位图计数断言全删。
- **O-R1-03**：两 runner 判据重造——身份哈希只含规范化 file×fullName 多重集合
  （status 分列逐行核），baseline/mutant/restored/final 四相位与同一非空声明集合
  比较（红相位身份漂移拒收）；行级 failed 与 identity.failedRows 交叉取消息
  （r1 空跑缺陷由自测 `non-assertion-error-reject` 实证捕获）；反控自测 17 例、
  repro 自测 15 例（含同数不同身份/红绿隐藏 skipped/零断言失败套件/身份与文件
  漂移/TypeA 额外未处理拒绝等反例）。每相位完整 JSON+TSV+console 落盘。诊断
  runner 核每条 repro 预声明执行身份（file+fullName 精确相等）与错误形状；Type A
  =恰一指定公开 IO 未处理拒绝（与普通反控"无 unhandled"分开判），额外
  harness/runtime 错误拒收。
- **O-R1-04**：隔离树复制现行 `pnpm-lock.yaml` + `install --frozen-lockfile`
  （安装后逐字节比对 lock 未改写）；prepareTree 失败路径内部清理并在异常携带证明；
  两 runner 回执在最终删树取证（existsSync=false）之后写入。
- **O-R1-05**：`docs/ops/evidence/README.md` 与
  `docs/phase-governance/reviews/20261004-semantic-current-batch.json` 已恢复至
  派发 `a2447b5c9` 字节；本证据目录缺共享导航登记是 docs 门唯一登记尾巴（见下）。

## 交付概览

- **3 条新合同 / 1 个测试文件**（产品零 diff）：`packages/reforge/src/opening-menu.io-lifecycle.test.ts`
  （O5 在途退出后迟到 IO 不复活、O6 重进消费真实 store 更新后的新数据、
  O8 有图/无图槽并存选档）。
- **排重账**：[dedup-ledger.md](dedup-ledger.md)（已证面 + r1→r2 变更账 + 3 净新
  合同 caller/输入/oracle/判别 + 缺陷登记表 + 判例）。
- **逐轴裁决**：[contract-ledger.tsv](contract-ledger.tsv)（O1–O8 全清单落判）。
- **D-Q01-1 重核与关联资源反例**：[repros.json](repros.json) — **8/8 PASS（pinned）**。
  Type A（R1/R2/R3/R5a）：业务单例全绿 + 恰一指定产品未处理拒绝 + exit 1
  （不叠加任何 Uncaught Exception/hook 错误）；
  Type B（R4/R5b/R6/R7）：恰 1 指定业务 AssertionError、零污染（含 hook/uncaught 形态）；
  每条 repro 同次子进程双 reporter。原始 JSON/console 见 [repro-raw/](repro-raw/)；驱动
  [tools/run-repros.mjs](tools/run-repros.mjs)（自测 19 例）。
- **三态变异反控**：[counterproof.json](counterproof.json) — **3/3 针 PASS（pinned，
  N1 退役不计）**。四相位与同一声明集合（file×fullName 身份）比较、每相位同次子进程
  双 reporter 联判、真实形态自检（纯红接受/两污染拒收）；相位材料见
  [counterproof-raw/](counterproof-raw/)；驱动 [tools/run-counterproof.mjs](tools/run-counterproof.mjs)
  （自测 20 例）。
- **树策略**：[tools/prepare-tree.mjs](tools/prepare-tree.mjs)（全 packages/* + 根清单
  + pnpm-lock，frozen 安装，失败路径内部清理；removeTree 取证 existsSync=false）。

## D-Q01-1 结论（重核，与 r1 一致）

**缺陷仍成立**：当前 main 的 `opening-menu.ts:122-131` `enterLoad` 对 `listMeta()`/
`getThumb()`/`createImageBitmap()` 的拒绝均无承接，`void enterLoad()`（`opening-menu.ts:147`）
留下进程级未处理拒绝，外层菜单 Promise 悬空。四个注入点（meta 读、thumb 读、解码、
退出后迟到）形状一致；替代解释「非法旧档/坏 PNG/产品已修复」均被排除——全部输入为
SAVE11 current 存档（`buildCurrentSavePayload` + 真实 store `putSlot`）与有效 PNG，
且仅单一公开边界拒绝。关联发现：重复输入 IO 放大与逆序旧盖新（R4）、退出后迟到
解码（R5b）、位图退役/收尾不 close（R6/R7）——释放与错误呈现策略均归
[产品卡](../../tasks/REFORGE-OPENING-LOAD-ERROR-1.md)（仍 draft），本卡不代批、不修产品。

## 门禁

- 定向 [directed.raw](directed.raw)（1 文件 3/3）；相邻 [adjacent.raw](adjacent.raw)
  （opening-menu 五文件 + main.host-lifecycle-1 + save 四文件，10 文件 54/54）；
- Reforge 全量 [reforge-full.raw](reforge-full.raw)（351 文件 8781/8781，
  较 r1 少 1 = 删除的 O4 缺陷绿合同）；
- typecheck exit 0（[typecheck.raw](typecheck.raw)）；
- 全仓 `pnpm lint` 零 error/warning/info（[lint.raw](lint.raw)）；
- `pnpm check:docs`：子门逐项 PASS（docs-tools/testing-docs/phase-lore/content-review
  strict 全绿，见 [docs-gate.raw](docs-gate.raw)）；唯一登记尾巴 = 主 docs 检查的
  「子目录未进入导航：docs/ops/evidence/TEST-REFORGE-OPENING-IO-LIFECYCLE-1」——
  共享导航文件按 O-R1-05 已恢复派发字节，登记留 Codex 集成时处理（一审明示允许
  恰此一项，不新增 ignore/豁免）；
- `git diff --check` 干净。

## 范围与安全披露

- 遵守卡面冻结（四个产品文件 SHA256 逐一核对一致）；注入仅在公开 SaveStore /
  浏览器解码边界（合法值 null、送达门控、单一拒绝），底层读写全部走真实
  Memory/IndexedDbSaveStore；无核心 mock、无私有 state、无强转、无 skip/todo、
  无 timeout 扩大；默认 suite 不留红、不把缺陷写成绿预期。
- 本卡为测试与前提取证 build：不合 main、不标 done，等待 Codex 终审；
  产品修复、错误提示/重试 UI、位图释放方案均在产品卡另行准入。
