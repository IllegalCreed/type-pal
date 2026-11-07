# 文档维护与自动检查

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-11-03
Template: guide-runbook-v1 / 1.0.0

## 目的

修改文档或路径后，按本页完成导航、索引和静态检查。目录与事实权查[文档模型](documentation-model.md)，交付及独立验收查[文档质量合同](document-quality.md)；本页只维护操作方法。

## 前置条件

确认当前任务、单一Owner、白名单、候选Git身份和[模板](../../phase-governance/templates/README.md)。先实读要修改的正文与实际consumer；历史签字、日期、结论和原始执行不因整理改写，旧done不授权新工作。

## 步骤

1. **确定当前正文与历史边界。** 现行规则回唯一事实源，历史推导按需从固定Git或既有归档恢复；不把旧全文复制进默认入口。包、工程与资源的README/PROVENANCE就地维护，第三方文档保留原结构。
2. **同步导航与状态。** README写职责、何时读、下一跳和必要边界，覆盖本目录直接文档及子目录；长清单可委派到显式链接的同目录`index.md`，检查器仍核完整覆盖与真实目标；任务先更新原卡顶部，再生成[任务索引](../../tasks/cards/index.md)并同步[看板](../../tasks/board.md)。完成本身不触发搬目录，旧归档保持稳定路径。
3. **迁移或删除前核闭包。** 冻结source revision/blob、路径映射、入链和机器consumer；重算链接并定向核锚点。删附件前核当前代码、测试、工程与实质文档消费者，以及独有信息和恢复来源；仍证明具体任务的证据不能仅因无代码引用就删。可重建本地产物注明生成条件，不能把忽略文件当有效链接目标。
4. **运行检查并保留真实结果。** 在仓库根执行下列命令；完整命令、输入身份、诊断和限制写回原任务/review。生成索引命令只输出Markdown，核对后由Owner写回。

```sh
node scripts/docs/check.mjs --json
node scripts/docs/check.mjs --print-task-index
pnpm check:docs
pnpm lint
git diff --check
```

新工作树若缺少E2E006固定证据，先运行`python3 -B scripts/docs/restore-e2e-evidence.py`；已有可信归档可加`--archive /绝对路径/e2e006-20261027.tar.gz`避免重复下载。恢复器按冻结的8项路径、SHA和字节核验，只还原留存原件，不执行产品或产生新的验收信用。

检查器实现改变时按影响运行`pnpm test:docs-tools`。同一候选已有可靠结果时按质量合同复用；全仓门由Owner在中央接入稳定后集中执行。

### 现行测试来源绑定维护

源码变化后先核实际差异与适用性。位置合同的 `testing-source-bridge` 仅支持[有限名单中的现行测试载体及来源](../../../scripts/docs/testing-source-bridge.mjs)。保留固定 Git 原件，独立审阅后更新现有 `sourceRef` 的指纹或行范围并追加一条复核 history。旧来源完整进入 `previousSourceRefs`。`runtime-active-scene` 的预取消镜头断言仅随已移动的同一来源更新对应 `path:lines` 指针。桥接器反向恢复该指针与来源及 history 后，逐值比较完整原对象，核对状态、成员、角色、候选、版本、原执行、附件、claim 和旧 history。新来源须通过实际字节、行范围与 anchor 校验，读取结束再核。

该模式保留原生JSON类型，不将它伪装为Markdown或给任意JSON开口。仍须真实非作者接受、afterSHA、Owner准入及catalog/report/evidence配对检查；复用证明只授具体来源适用性，不产生新的runtime/E2E/视觉信用。其它载体、来源或字段不在此有限合同内，不能借重标类型、ignore或更新旧接受指纹绕过，需先核实际维护合同。失败输出和历史原件保持原字节。

007–009 的正式登记另在来源回绑之后核对。独立准入固定回绑已通过的 catalog Git 原件，分别检查原维护层和来源回绑层，再按 `007`、`008`、`009` 顺序追加三个现行阶段及各自的 `entryReadings`。其余 catalog 字段和原成员顺序完整保留。每个阶段的 `report.md`、`README.md` 和机器回执均按精确路径登记，新增 JSON 继续使用 `test-machine-evidence-v1 / 1.5.0` 的原生执行格式。`check-testing` 仍核发布状态、声明源码、发布依赖、执行附件指纹和索引投影。同引擎前驱、正式终档及用户确认按各段原件验收。

010 的正式登记另固定已刊 007–009 的 catalog Git 原件。原三段先通过既有准入，现行 catalog 再与该原件逐值比较，只追加 `e2e-010` 和对应 `entryReadings`。010 的报告、阶段页和原生执行回执使用各自固定路径，继续受发布配对和独立文档准入检查。

普通宝箱提取后的来源维护以固定的已刊 010 提交为中间层。先用该提交的真实来源验证既有桥接和阶段发布，再验证三条运行时记录原有 `main.ts` 引用的摘要更新。四处锚点要求原行范围和字节相同，每条历史只追加一次并指向同一适用性回执。阶段报告、阶段页与原生执行回执继续按固定发布字节核对，现行配对检查仍验证实际来源和历史对应关系。

content23 四类取物的来源维护再以固定 `0973c2c25795fd2aacf78daedebb8d8f2a5113fc` 接续。其 [有限桥接](../../../scripts/docs/testing-acquisition-source-bridge.mjs)只准入实际受影响的 22 个条目、32 个条目/来源组合；catalog 与配对 evidence 各 41 条现有来源更新摘要或行范围。007、009 的两个精确版本锚点只允许 22→23。战斗会话及指令表单两个 source-contract claim 中的四个既有来源指针仅随对应行范围移动，反向恢复后仍须逐值等于固定原对象。各组只追加一次 history 并完整保存旧引用；原候选、版本、状态、断言信用、运行记录和附件不变。旧维护层先用原来源重验，新层不扩大旧白名单；本轮新运行另由 [N6b 任务](../../tasks/cards/N6B-ITEM-FLOWS-1.md)的原件记录。

该有限层另接 007–009 三个确切发布报告的唯一 `testing-meta`：只同步同组来源及 history，恢复旧 metadata 后整份 Markdown 必须逐字节等于固定原文。正文、标题、front matter 和原运行字段保持；不扩至 010 或任意新 Markdown。

### 留存附件的压缩与读取

开发留痕中的大文本可按已独立准入的位置合同无损 gzip；保留每份逻辑路径、固定 Git blob、原载体 SHA/字节及压缩文件 SHA/字节，不合并执行。历史 display 副本与 original 原件按原映射区分，压缩 display 不使其成为原执行输出。

原逻辑或当前路径可交给 `node scripts/docs/read-retained-artifact.mjs PATH` 查看身份，加 `--cat` 输出已核原字节并重定向到仓外临时文件。现行 Markdown 链接指向实际 .gz，冻结 JSON 与保全引文仍保持原身份；缺载体、变字节或未声明缺失须拒绝，不能从 Git 静默补读。新反控输出的 gzip 描述须分别记录 stored 与 decoded 身份，原判据仍核解压 TSV。

### 历史输入附件的显式退出与恢复

已无现行文件消费者的历史 `.gz` 输入附件，可经知识承接、必要证据与依赖审查后列入位置合同的 `retiredArtifacts`。每个准入成员记录原逻辑路径、固定 Git blob、SHA256 和字节数；来源提交统一取该合同的固定 `baseRevision`。这是逐成员的生命周期裁定，文件名、目录、同内容或旧完成状态均不单独授权清理。

同一四字段合同允许退出 `docs/ops/evidence/` 下的历史 `.txt`、`.log`、`.tsv`、`.raw` 捕获原件。旧任务路径仅另准入 `docs/ops/tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/fullsuite.raw` 与 `docs/ops/tasks/evidence/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1/directed-adjacent.raw`，不扩其它任务目录。已压缩成员须同时撤销其压缩映射与实际gzip载体；退出共用baseline时，关联旧别名也分别按固定原源准入退出。各次counterproof JSON的执行label、argv、结果与descriptor保持不变，display与original仍分别恢复各自字节和SHA。计数区分实际载体删除与已缺席别名身份，不能把同一文件重计净删减。

同一合同也允许逐成员退出两处关闭回放树的 `.ts`、`.tsx`、`.mjs`、`.mts` 输入：`docs/testing/archive/legacy/batches/glm-architecture-regression-lab/` 下的 `candidates`、`configs`、`diagnostics`、`fixtures`、`tools`，以及 `docs/testing/archive/legacy/unresolved-tools/`。这些明确子树纳入同一完整文件集检查；未声明缺失、新文件和未退休原件漂移仍须拒绝。产品代码、正式测试、其它目录及 `.md`、`.json`、`.html` 正文不能借此退出。

成员较多时，同一份四字段集合可放在普通附件 `docs/tasks/evidence/REPO-SLIM-PLAN-1-retired-artifacts.json.gz`；必要时物理拆成最多四片，后续固定后缀为 `-2.json.gz`、`-3.json.gz`、`-4.json.gz`，不再内联另一份。`retiredArtifacts` 为一个或最多四个精确七字段描述：`codec`、`path`、`storedSha256`、`storedBytes`、`decodedSha256`、`decodedBytes`、`entries`；不混入旧四字段成员。每片的stored身份须与现有 `artifacts` 登记一致，文件为普通0644；未声明片、重复片或跨片重复成员拒绝。每片压缩最多1MiB、解压最多4MiB，集合最多16384成员、累计解码最多16MiB；严格UTF8/JSON拒绝BOM、重复键或尾随内容，逐成员仍走原来源、冲突和缺席校验。根合同本批限制1MiB，准入SHA核对后、JSON解析前检查；名单只承载同一行政集合，不装语义报告、执行日志或新信用，读取结束逐片重核原身份与完整字节。

大集合按最多512成员、源字节合计最多32MiB的窗口批读取；初验和终检都逐成员核完，不跳过尾部，不扩大既有4096对象/128MiB缓存。默认正文、别名与压缩来源继续按原规则预取，退休窗口不会将它们留作逐件Git读取。

实施者先核当前副本与固定原件一致，再删除获准成员；校验器要求原路径和迁移后路径均缺席，并继续核未退出原件、保留元信息和完整文件集。运输表、各次输入/退出结果、独有失败与读取范围分别保留。治理正文与当前review存储不能借此退出；别名及压缩映射须先核其消费者与恢复闭包，按上文明确规则同步撤销，不得保留重叠声明。

复核旧输入时，将 `git show 'ARTIFACT_REV:ARTIFACT_PATH'` 中两项占位符分别替换为已准入合同的 `baseRevision` 和成员的 `path`，重定向到 `/tmp` 等仓外临时文件。先核导出原件的 SHA256/长度与成员记录一致；未压缩文本及回放源码直接恢复原文件，不必解压。gzip输入再按原运输表或输入快照描述核一次解压所得 payload 的 SHA256/长度。若 payload 原本就是 `.patch.gz`，一次解压恢复的仍是该原始压缩文件，不能把再次解压后的文本当成原 payload。源码输入继续沿用原读取边界；恢复完整载体不把 `fullRead=false`、局部 ranges 或失败结论改写为全读通过。

PR40的109份gzip及17个别名旧映射可从[固定eb223位置合同](https://github.com/IllegalCreed/type-pal/blob/eb223e8ae7b9f0062cbbaaf9869e890b6a974c91/docs/phase-governance/document-locations.json)恢复；选择该版本stored链接时按其stored/decoded双身份核对，不能将编码文件SHA与原文SHA混用。

普通读取和 `assertCurrent` 不从 Git 补出已退休附件；`read-retained-artifact` 的 `--cat` 仍只读取现存且已准入的载体。不要把恢复文件放回已声明退休的检出路径，其重现会被拒绝。恢复只用于重读原件，不产生新的执行或验收结论。

### 历史专用工具

`scripts/docs`中固定20261004布局的`build/apply/enrich/finalize-ops-governance-plan`、封闭批次的publication工具，以及DOCS-RECORD-INTEGRITY-1的capture/inspect/audit脚本只用于按固定提交隔离回放。其旧路径和接受指纹属于历史身份；不能直接在当前树调用，也不将输出重定向后覆盖历史原件。日常维护使用上列现行检查入口；新写入工具另核具体任务、范围和消费者。

关闭质量窗口中 `docs/tasks/evidence/**/verify*.mjs`、`native-archives.mjs` 等也按原回执的完整源候选和依赖隔离复验；先恢复脚本、索引、所需输入和记录的源码/测试边界，再按原合同运行。仅恢复固定159中的附件不保证旧测试名、外部输入或环境已经恢复。旧README中的“默认快检”不表示现行流水线入口；发现固定pin已漂移或原输入不可得时明确报过期/不能复验，不能改脚本补读当前替代物或把回放算新执行信用。

### 检查范围

文档检查使用Git跟踪及未忽略新Markdown的工作树内容，检查本地链接目标、目录索引、任务投影和选定现行版本合同。链接目标须属于这些文件或其父目录；机器上的空目录、`.DS_Store`和忽略产物不构成有效目标。

锚点、外站内容及任意HTML/MDX不由基础链接检查保证；改标题或跨页引用须另核实际目标。版本检查段由[配置](../../../scripts/docs/config.mjs)定义，不能全局替换历史版本或把未来规划当当前格式。

## 失败处理

目标缺失、索引/状态漂移、合同版本冲突或中央SHA失配，停受影响项并核实际差异；不批量刷新hash掩盖未读正文。例外只能精确到source、target和reason，不新增ignore、排除或降级规则来过门。

共享树出现其他Owner改动时保护原文件并交Owner协调，不reset、stash或覆盖；恢复只按已核映射和固定来源执行。证据不足或语义冲突仍交独立验收，退出码0不能代替零诊断或内容正确。

## 完成定义

正文、入出链、索引和对应review同步，必要硬门error/warning/info全部为零，并取得范围对应的独立裁定。静态文档通过不等于产品、运行、E2E、视觉、coverage或部署通过。

本页现行操作从文档模型和质量合同承接；旧封套、源全文及当时结论按需查[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/guides/documentation.md)，不作为新的执行结果。
