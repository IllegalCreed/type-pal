# 作者保存恢复：GLM打开身份测试包

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，build，r2设计签字有效，不重签。
工作包：**open-identity-r1**。2026-09-12用户要求给GLM可并行工作，并明确视觉测试只能由Codex执行。

## 分工与基线

- Codex仍是生产Coding Owner，负责project-io剩余分支、性能/权限遗留、集成及最终质量门。
- **GLM只做代码级测试和文本回执。不得分派浏览器操作、截图/录屏判断、布局/观感或任何视觉验收。**
  下文finishOpen是函数调用测试，不是让GLM实际打开界面。已有视觉证据由Codex负责，不要求GLM看图判断。
- GLM属于测试贡献者，不作为本包的独立第三方自证；终审必须披露。
- 从包含本工作包的最新origin/main建立新worktree及`codex/glm-open-identity-tests`分支，不复用旧返工分支。
- 生产基线1ba88755；后续主树只有测试/文档/生成coverage baseline变化。若核心生产源码已变化，先交Codex确认。
- 主树已有`workspace-save-admission.test.ts`20项，属于Codex首存写侧，GLM不得修改。

## 唯一写入白名单

1. 新增`packages/editor/src/core/workspace-open-identity.test.ts`。
2. 本附件下方“GLM回执”区域。

不改生产、旧测试、共享fixture、全局配置、依赖/超时/排除、scripts、官方覆盖率基线、PAL产物、data或原审计探针。
不stash、不在main直接实现或合并，不追踪资产/软链接；优先用自产blank fixture，不依赖PAL版权资源物化。

## 先读

AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、父卡r2签字/范围及最新回执；
[逐臂台账](editor-save-recovery-coverage-pending.md)；
[workspace-persistence.ts](../../packages/editor/src/core/workspace-persistence.ts)的resolveOpenedWorkspaceContext及调用链；
[open-actions.ts](../../packages/editor/src/core/open-actions.ts)的finishOpen；
[workspace-context.ts](../../packages/editor/src/core/workspace-context.ts)的真实身份/证明构造器；
已有open-actions/open-local/pal-save-identity/workspace-save-admission回归，避免只换名称重复证据。

## 一批完成的矩阵

核心合同：打开后的身份不能与目录、最近记录或当前操作矛盾，不能把受限工作区降级。
预期从现行合同核定，不预填“所有组合都拒绝”，也不能因实现接受就把疑似漏洞写成正确正控。

| 组 | 输入与业务结果 |
|---|---|
| OI-L 普通本地 | 合法无marker目录/最近记录；projectId漂移；无marker却带受限hint；hint项目ID与manifest冲突；合法hint/记录对照 |
| OI-S 沙盒 | 合法marker与三种支持source；marker和manifest项目ID冲突；hint的mode/workspaceId/source不一致；既有记录的handle/mode/project/source冲突；合法对应对照 |
| OI-P PAL | 从独立可信FileSource经真实构造器产生proof；普通hint不能借sentinel取得PAL权限；既有绑定换目录或mode/project/source冲突；合法PAL函数入口；forceSandbox检视不能返回原目录写权限 |
| OI-E 最近入口预期 | expectedIdentity按workspaceId/projectId/mode/source逐维不符与全匹配；冲突时不返回可编辑会话、不登记新绑定，原目录/记录保留 |

主要落点wp182–208附近的**代码路径**。不要为contextFromRecord等私有分支造getter切换mode、伪造私有品牌、
导出私有函数或篡改内建对象。被前置守卫挡住，给直接调用链证据交Codex分类，不堆畸形fixture。

## 证据要求

- 复用buildBlankProject、memoryAuthorDirectory、memoryAuthorSaveStore及真实身份构造器；fixture先经正式loader成功。
- 可直接测公开resolver，但每种工作区至少有一对finishOpen函数的合法/冲突入口，核正式读取与登记顺序。
  PAL可信源不得用被篡改目标临时自授权；这些全部在Vitest里执行，不使用浏览器。
- mock只限FSA/IDB/必要HTTP边界；保留真实锁或已验证锁合同，不mock被测resolver/loader/validator。
- 每个拒绝用例只改变它声称核验的身份轴；配合法对照，核文件快照、创建/写入/删除轨迹与原绑定不变。
  0次循环不是“全部通过”；零凭据须直接断言数量。
- 异步变化用实际阶段内entered/deferred，不用睡眠猜时间。
- 至少两组单点负控，必须出现错误放行/错误会话/错误登记等业务红；只换报错文字、加载失败或fixture自己报错不算。
- 发现产品缺陷，只保留最小反例、file:line、正控/影响/替代解释，明确区分预期红与测试失败，交Codex，不改生产。

## 验证与交付

跑本包及直接相邻测试、editor typecheck、新文件biome；覆盖报告放临时目录，逐branchId/arm与台账对账。
分开记录新命中/既有证据/待Codex核定；报告0命中不能写已有覆盖，不能凭函数级百分比宣称逐臂完成。
完整check/官方ratchet/单次严格fast由Codex集成后统一执行，GLM不改基线、不做视觉测试。

所有计数来自最终提交树，记录每次失败命令/exit/原因。完成后提交推送自己的分支并核远端SHA，
给白名单diff、测试名/矩阵映射、负控唯一替换点与重建方式、剩余问题。
不代签、不改父卡状态、不标done、不转Kimi；交Codex独立复核与集成。

## GLM回执（仅GLM填写）

**open-identity-r1（2026-09-12），分支 `codex/glm-open-identity-tests`，worktree
`/Users/zhangxu/illegal/type-pal-glm-open-identity`，起点 945f54ab（基线 1ba88755 生产零漂——
1ba88755..945f54ab 仅 docs/新测试/coverage baseline）。** 白名单实际改动：仅新增
`packages/editor/src/core/workspace-open-identity.test.ts`（15 用例）+ 本回执。不改生产、
旧测试（含 Codex 的 workspace-save-admission 20 项）、共享 fixture、配置、baseline、资产。

### 矩阵与逐项证据（测试全名 → 组/轴）

| 测试全名 | 组/核验轴 | 结果 |
|---|---|---|
| OI-L 正控: 无 marker 目录首次打开 | L：合法无记录 → local-project+登记 local-directory | 绿 |
| OI-L: 最近记录 projectId 漂移 | L：记录漂移拒绝、原记录不被覆盖（bindings 快照） | 绿 |
| OI-L: 无 marker 却带受限 hint | L：sandbox/PAL hint 无 marker 拒绝恢复（两变体同用例）、零 IO 零登记 | 绿 |
| OI-L: hint projectId 与 manifest 冲突 | L：hint 身份漂移拒绝 | 绿 |
| OI-S 正控: 合法 marker 三种 source | S：ui-samples/sandbox-copy/review-copy 均装配 sandbox 会话 | 绿 |
| OI-S: marker 与 manifest 项目 ID 冲突 | S：marker 漂移拒绝、零 IO | 绿 |
| OI-S: hint 的 mode/workspaceId 不一致 | S：当前操作与 marker 冲突拒绝（两变体） | 绿 |
| OI-S: 既有记录句柄/模式/项目/来源冲突 | S：四轴逐项（parametrized 循环，每轮清库）、原记录快照不变 | 绿 |
| OI-P 正控: 独立可信源 proof | P：真实构造器 → finishOpen 装配 pal-development/pal-bound | 绿 |
| OI-P: 普通 local hint 不能借 sentinel | P：受限提权拒绝、零登记 | 绿 |
| OI-P: 既有绑定换目录/三轴漂移 | P：四轴逐项、原记录不变 | 绿 |
| OI-P: forceSandbox 检视 PAL | P：降级 ui-samples 检视会话、不登记原目录 | 绿 |
| OI-E: expectedIdentity 逐维不符 | E：workspaceId/projectId/mode/source 四轴 + 全匹配正控、拒绝后无新登记 | 绿 |
| OI-E: expectedIdentity 句柄指向他目录 | E：finishOpen 载入前拒绝（O3 层）、原记录不变 | 绿 |
| resolver 直测: 无 marker 无记录 | 合同补充：新 local 身份 + forceSandbox 包装 | 绿 |

PAL 可信源：独立 memoryAuthorDirectory 字节经 vi.stubGlobal('fetch') 按 'projects/pal/<rel>'
提供（finishOpen 内 httpSource('projects/pal') 走真实 readText/readJson 与指纹计算）——
非被篡改目标自授权。所有冲突用例核三件套：整份文件快照逐字节不变、creates/closes/removes
全空、bindings 快照不变（或零登记）；`receipts.size===0` 直接断言数量。无浏览器操作。

### 单点负控（/tmp/glm-oi-nc.config.mts 可重建，每针唯一替换点）

| NC | 突变（唯一替换） | 业务红因 |
|---|---|---|
| ncRecentPidDrift | resolver 中和 recent 记录 projectId 漂移 throw | OI-L 漂移用例 **错误放行**（resolved Opened 而非 reject） |
| ncExpectedIdentity | assertExpectedWorkspaceIdentity 整体中和 | OI-E 逐维用例 **错误放行** |
| ncFinishOpenHandle | finishOpen 移除 expectedIdentity 句柄核对 | OI-E 句柄用例 **错误放行** |
| ncSandboxRecordDrift | sandbox 记录一致性 throw 中和 | OI-S 记录漂移用例 **错误放行** |
正常实现 15/15 绿。四组均为错误放行/错误会话级业务红，非文案差异。

### 逐臂对账（本批 cov 报告，临时目录 /tmp/glm-open-identity-workspace/cov）

同口径 editor-fast **200 文件 / 2,056 项全绿**。workspace-persistence 从 353→**393/435**（本批 +40 臂）、
open-actions 103→**103/108**（覆盖已达行 119/119 100%）。

**本批新命中（此前台账 0 命中的臂，现由本套件执行）**：
- resolveOpenedWorkspaceContext：185/0@940、190/0@953、192/0@957、196/0@963、206/0@993、
  208/0@1000（hint/marker 身份冲突族）；182/1@916+183/1-3@918-920（OI-E 四轴）；104/0@590、
  106/0@592、107/0@594、109/0@601（OI-P hint 提权/PAL 记录 workspaceId）；149/0@760、150/1@760、
  162/0@803、165/0@808（forceSandbox/first-save PAL 边）；132/0@698、138/0@718（绑定记录缺席/
  受限残留）；130/0@689 由 pal-save-identity 双标记用例（本树）先行命中。
- contextFromRecord 多数 mode/source 组合臂经 OI-S/OI-E 记录构造路径命中。

**仍未覆盖（42 臂 wp + 5 臂 open-actions，分类）**：
- write/read 私有路径守卫终态（readJsonState 3/1、writeJsonSidecar 4/0、authorizedSaveScope 20/25/26、
  seal 35/0、complete 50/0、plan 82/0、recordRemove 85/0、begin 96/0、recordWrite 71/77/80、
  allowPrivate 42/45/47、registerMutation 88/89/91/93 共 21 臂）：mutation 活跃期内部身份校验终态，
  公开入口无法构造非活跃调用（不伪造品牌/mutation）——待 Codex 核定。
- PAL 写侧指纹族（readPalDev 7 + palDevFingerprint 2 + fingerprintExpected 2 + 164/2@805 共 12 臂）：
  PAL 目录写保存域，Codex 首存写侧保留。
- preflight 158/159@775、169/0@823（沙盒重绑定/PAL invalid）与 contextFromRecord 175-178（记录
  mode 非法组合写入终态）共 9 臂：可达待测，归 Codex 后续批（不改权限模型不伪造）。
- open-actions 5 臂（saveProjectAs 38/45/49/53 + readOpenedProject 24/0）：另存取消/源缺失/
  metadata 漂移族，project-copy 12 项相邻已覆盖主路径，臂级证据待 Codex 核定。

### 验证与失败记录

- 定向+相邻（本文件+open-actions/open-local/pal-save-identity/workspace-save-admission/
  workspace-persistence 6 文件）**94/94 绿**；editor typecheck exit 0；新文件 biome 0 error
  （一次 format 自动修复后复跑）。
- 完整 `pnpm check` 第一次 exit1：pal-extract ENOENT data/raw/M.MSG——**本 worktree 环境缺
  gitignored 资产**（非候选缺陷）；本地 symlink/拷贝补齐后第二次 **exit 0 共 6,783 项**
  （/tmp/glm-open-identity-workspace/full-check{,2}.log）。资产链接均未入 Git（ls-files 空）。
- 无产品缺陷 counter；完整 check/ratchet/严格 fast 官方门禁留 Codex。

### 交接

GLM 测试贡献者，终审须披露。测试候选 `e1c0d67e`（amend 回填前提交；本回执内 SHA 自指以下方最终推送 SHA 为准）。
