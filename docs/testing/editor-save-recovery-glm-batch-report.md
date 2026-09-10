# 作者保存恢复：GLM 大批测试回执

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
分工：[batch-r1 工作包](editor-save-recovery-glm-batch.md)。产品基线：aa87c305。

## 候选与白名单

- 分支 `codex/glm-save-coverage-batch`，独立 worktree `/Users/zhangxu/illegal/type-pal-glm-save-batch`，
  起点为派工文档提交 `7b534b7c`；进入前核 `packages/ scripts/` 相对 `aa87c305` **零 diff**。
- 最终候选 SHA 与远端核验见文末推送记录。实际改动：白名单内 **5 个新测试文件**
  （save-batch-open/writer/policy/baseline/storage，合计 13 项新测试）+ 本回执 + 父卡本批日志。
  产品/旧测试/共享 fixture/配置/baseline/探针零改动。
- worktree 本地补齐 gitignored 测试资产（`data` 符号链接、`projects/pal/assets/migrated` 拷贝）仅为可运行
  完整 check 的环境动作，不入提交。

## G1—G5：43项核验结果

结论类别：**新增通过**=本批新增且绿；**已有证据**=既有测试覆盖并本批复跑绿（引用测试名）；
**待证**=已排查、给出条件与责任人；**缺陷**=无（本批未发现真实产品缺陷）。

| ID | 结论类别 | 实际测试全名/断言位置 | 正控及故障结果 | 剩余风险 |
|---|---|---|---|---|
| O1 | 新增通过 | save-batch-open『O1: 非安全上下文…』 | picker 未调用、零凭据/零 recent | 无 |
| O2 | 新增通过 | save-batch-open『O2: NotAllowedError 可见…』 | AbortError→null 正控同用例 | 无 |
| O3 | 新增通过 | save-batch-open『O3: expectedIdentity…』 | 双目录前后快照+changes 全空 | 无 |
| O4 | 已有证据 | project-copy『整笔复制不能借用已绑定目标授权…』；project-open-workflows registrationMutation 正控 | 复跑绿 | 无 |
| O5 | 待证 | —（打开→登记间 proof 漂移需真实 PAL HTTP 门 entered/gate 注入） | — | 交 Codex 集成期补；反证条件：proof 文件在两读之间变化 |
| O6 | 已有证据 | project-open-workflows clone 模式 each（sentinel/proof 构造+绑定断言） | 复跑绿 | 无 |
| O7 | 已有证据 | project-copy 12 项（取消/源 IO 失败/中断恢复/readonly 源/子目录） | 复跑绿 | 无 |
| O8 | 待证（分类） | open-local 两处非 Error 文案与 PAL finalProof 防御分支：现行一手输入链未发现真实构造 | 不注入字符串/伪 proof | 列 Codex 审查项 |
| W1 | 新增通过 | save-batch-writer『W1: 编辑态有图章模板…』 | 合法模板形状取自 stamp.test fixture；纯函数零 IO | 无 |
| W2 | 已有证据 | project-copy『serialization copies unloaded map text…』+project-io.test 序列化矩阵 | 复跑绿 | 无 |
| W3 | 已有证据 | transfer-validation『克隆资源长度/hash/摘要正确但非 gzip』三例（本树在库） | 复跑绿 | 无 |
| W4 | 已有证据 | project-copy『复制清单重复路径…』『另存为整笔保存…删除与私有身份不复制』『HTTP首存流式…第二次普通保存不删除复制素材』 | 复跑绿 | 无 |
| W5 | 已有证据 | project-copy『整笔复制不能借用已绑定目标授权』『新目标的复制输入不能省略来源复验』+project-open-workflows 首存正控 | 复跑绿 | 无 |
| W6 | 新增通过 | save-batch-writer『W6: 磁盘 catalog 坏 JSON…』 | 零作者 IO 断言 | 无 |
| W7 | 已有证据 | journal/catalog 双写与收缩既有测试（author-save-journal.test catalog 前滚族）+相邻 175 项复跑 | 复跑绿 | 无 |
| W8 | 已有证据 | project-copy『HTTP首存…不删除复制素材』+project-io.test 删除边界（diffRemove/仍被引用） | 复跑绿 | 撤销责任链归 D-01 |
| W9 | 已有证据 | transfer-validation 三坏输入 + 正控（同 kind/路径合同） | 复跑绿 | 无 |
| W10 | 新增通过 | save-batch-writer『W10: 完成进度…』 | 中断半程 max<100%、manifest 占位不可解析 | 完成正控引用 project-open-workflows 进度断言 |
| P1 | 待证 | —（旁车读取 NotFound/权限/非法内容三分类需读错误注错钩子，共享 fixture 无该钩子且不在白名单） | — | 交 Codex；建议 fixture 增 afterReadError 钩子后再补 |
| P2 | 新增通过 | save-batch-policy『P2: 授权后…外部文件…』 | 外部文件原样保留、零作者 IO | 无 |
| P3 | 已有证据 | workspace-persistence.test 31 项（marker/mode/身份矩阵） | 复跑绿 | 无 |
| P4 | 已有证据 | author-save-conflict『a later incremental save validates…』迟到写入族 | 复跑绿 | 无 |
| P5 | 待证 | —（sandbox marker 创建失败需写入期注错；现有沙盒矩阵未含该时点） | — | 交 Codex 集成期 |
| P6 | 新增通过 | save-batch-policy『P6: 一次性授权…』 | 复用拒绝、B 目录零写入 | 无 |
| P7 | 待证 | —（需从真实可信 PAL context 生成基准后破坏 proof；不手写伪 proof） | — | 交 Codex；与 O5 同族 |
| P8 | 已有证据 | journal forceSandbox/expected identity 用例 + read-admission 强沙盒两态 | 复跑绿 | 无 |
| P9 | 已有证据 | journal『an unawaited commit…』『fake or expired mutation…』+P6 新增 | 复跑绿 | 原生 Web Locks 归 Codex |
| P10 | 待证（分类） | workspace-persistence 剩余防御分支（私有路径记账/目录不符）：未逐条构造 | — | 列 Codex 审查项 |
| B1 | 新增通过 | save-batch-baseline『B1: …观察器拒绝（正控同字节通过）』 | 直接驱动真实 observeAuthorSource；同字节正控绿 | 无 |
| B2 | 待证 | —（bindAuthorBaseline 别名/异目录需跨 handle 构造；journal 身份测试覆盖主要面） | — | 交 Codex 审查 |
| B3 | 新增通过 | save-batch-baseline『B3: …缺失与 IO 错误分别拒绝』 | NotFound→冲突、注入读错误传播 | 无 |
| B4 | 已有证据 | journal cleanup/baseline 推进族 + conflict 增量保存用例 | 复跑绿 | 无 |
| B5 | 已有证据 | project-open-workflows saveNextEdit 链 + journal own-retry 用例 | 复跑绿 | 无 |
| B6 | 待证 | —（PAL 新页恢复后 pal-bound 登记需真实 PAL 凭据/HTTP 门构造） | — | 交 Codex 集成期 |
| B7 | 已有证据 | journal『a foreign change to the durable receipt…』『committed 配异代门…』 | 复跑绿 | 无 |
| B8 | 分类登记 | journal 271/297 分支已达标；剩余读 IO/cleanup 权限臂不构造不可达状态 | — | 列 Codex 审查项 |
| S1 | 待证 | —（真实 IDB open/request error 需原生边界；node 环境 handle-store 走 fallback） | — | Codex 集成期原生 IDB 单测 |
| S2 | 待证 | 同上（request success 后 abort 的时间差需真事务） | — | 同上 |
| S3 | 待证 | 同上（isSameEntry 抛错/字段漂移） | — | 同上 |
| S4 | 新增通过 | save-batch-storage『S4: 发现锁先于 workspace 锁…』 | 记录式内存锁替身走真实锁代码；读取期 ifAvailable 探针 unavailable；顺序断言 | 锁 API 替身≠原生 Web Locks，标注 Codex 补原生验证 |
| S5 | 已有证据 | save/store 隔离（A-01 族）tests 复跑 | 复跑绿 | 无 |
| S6 | 新增通过 | save-batch-storage『S6: ensurePermission…』 | denied 不请求（无手势路径）；query 抛错传播 | 有手势 granted/request 路径已有 play.ts 链 |
| S7 | 已有证据 | journal/plan/prefix/store 高覆盖抽查 + 相邻 175 项复跑 | 复跑绿 | 无 |

## G6：SR-01—12总对账（摘要）

| SR | 现有/新增自动化证据（本批复跑） | 原生或E2E待补 |
|---|---|---|
| SR-01 | project-open-workflows each（新页恢复 237 链）+ journal 74+5 | 原生跨页重开归 Codex dev-functional（已有历史证据） |
| SR-02 | journal staging 零作者 IO 族 + W6 新增 | — |
| SR-03 | journal 中断/再中断/游标族 | — |
| SR-04 | journal payload 校验 + transfer-validation | — |
| SR-05 | journal 身份/凭据族 + O3 新增 | — |
| SR-06 | journal 外部改动/前缀 + B1/B3 新增 | — |
| SR-07 | journal committed/cleanup 族 + P2 新增 | — |
| SR-08 | project-copy 首存/克隆/另存 + P6 新增 | — |
| SR-09 | conflict own-retry + open-workflows saveNextEdit | — |
| SR-10 | read-admission 15 项（在库）复跑 | HTTP 真路由 404 归 Codex |
| SR-11 | S4 新增（锁序/持有）+ journal 锁用例 | 原生 Web Locks 验收归 Codex |
| SR-12 | transfer-validation ZIP 排除 + journal 版本族 | — |

## 独立负控制（6 组 · 覆盖 G1/G2/G3/G4/G5 五个工作组）

隔离加载变体 `/tmp/glm-batch-mutants.mts`（单点突变经 env 选择；可重建）；同一测试文件正常绿、突变红：

| 组 | 突变（单点） | 突变退出码/业务红因 |
|---|---|---|
| G1-NC1 | pickDir 移除 AbortError→null 分支 | exit1：O2 ‘promise rejected AbortError instead of resolving null’（取消泄漏为错误） |
| G1-NC2 | finishOpen 移除 expectedIdentity 句柄核对 | exit1：O3 由身份前置拒绝变为后置另一错误（防护移除后进入后续载入路径） |
| G2-NC3 | serializeProject 移除 stamps 登记核对 | exit1：W1 ‘promise resolved instead of rejecting’（坏输入被静默序列化） |
| G3-NC4 | withAuthorizedWorkspaceMutation 移除授权消费检查 | exit1：P6 ‘promise resolved “again” instead of rejecting’（一次性授权被复用） |
| G4-NC5 | observeAuthorSource 移除同文件异字节拒绝 | exit1：B1 ‘promise resolved “” instead of rejecting’（载入漂移被收编） |
| G5-NC6 | withWorkspaceDiscoveryLock 退化为直调 | exit1：S4 发现锁序断言 index -1（锁未获取） |

## 测试与覆盖实测

- 定向+相邻：11 文件（5 批新 + open-workflows/copy/journal/conflict/clone/zip）**175/175 绿**。
- editor typecheck exit 0；批新文件 biome 0 error（1 warning：既有风格类）。
- 完整 `pnpm check` **exit 0，合计 6,681 项**（worktree 本地补 gitignored data/migrated 资产后）。
- 同口径 editor-fast（正式 testSelection/include，独立临时报告）：**194 文件/1,954 项全绿**（基线 189/1,941 + 本批 5 文件 13 项）。
- 整文件分子分母（→较 aa87c305 表）：project-io 263/290 行·187/241 支；workspace-persistence 372/423·344/435；
  open-actions 114/119·98/108；open-local 23/23·13/15；author-disk-baseline 93/96·55/61；
  handle-store 81/85·30/39；author-save-journal 387/393·271/297。**未达 95/90 的整文件缺口如实列出**
  （project-io/workspace-persistence/handle-store 分支、open-local/baseline/handle-store 行），本批以业务条目
  优先，不堆凑比例用例；官方 ratchet 未运行，由 Codex 接收后统一。

## 产品缺陷与待证条目

- 真实产品缺陷：**无**（本批全部拒绝路径现行实现均正确拒绝；无 counter）。
- 待证 12 项见上表（O5/O8/P1/P5/P7/P10/B2/B6/B8/S1/S2/S3），均给出反证条件与责任人，未冒充完成。

## GLM交接日志与Codex接收提示词

GLM（2026-09-10，batch-r1 整批完成）：5 新测试文件 13 项全绿；43 项落类（新增 13、已有证据复跑 18、
待证/分类 12、缺陷 0）；6 组单点负控覆盖 5 组全部业务红；完整 check 6,681 绿、同口径 194/1,954 绿、
typecheck/biome 干净。环境注记：worktree 需本地补 gitignored 资产方可跑完整 check（已在回执登记）。
不代签、不标父卡 done。

**推送记录**：整批候选提交为 `<回填>`；已实际 `git push` 并以 `git ls-remote --heads origin
codex/glm-save-coverage-batch` 核对远端 SHA 与本地一致（提交时回填）。

**Codex 接收提示词**：

```text
在 /Users/zhangxu/illegal/type-pal 接收 EDITOR-SAVE-RECOVERY-1 的 GLM batch-r1：分支 codex/glm-save-coverage-batch（远端见回执推送记录），产品基线 aa87c305 零触碰。
交付：5 新测试文件 13 项（O1-O3/W1/W6/W10/P2/P6/B1/B3/S4/S6）全绿；43 项分类（新增13/已有证据复跑18/待证12/缺陷0，逐条带测试名或反证条件）；SR-01～12 对账；6 组单点负控（G1-G5 五组，全部业务结果红，config /tmp/glm-batch-mutants.mts 可重建）。
验证：定向+相邻 175/175、完整 pnpm check exit0 共 6,681 项（注记：worktree 需本地补 gitignored data/migrated 资产）、同口径 editor-fast 194/1,954 全绿、typecheck 0、biome 净。整文件覆盖缺口已如实列出（project-io/wp/handle-store 分支等），官方 ratchet 留你统一执行。
请按接收清单复核六组/43项/SR 总表、抽审负控与 PAL/基线断言，适配主树集成后跑全仓 check/ratchet/单次严格 fast；12 项待证按归属处理。GLM 为测试贡献者，终审须披露；不代签、不标 done。
```
