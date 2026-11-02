# 文档维护与自动检查

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-11-02
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

### 历史专用工具

`scripts/docs`中固定20261004布局的`build/apply/enrich/finalize-ops-governance-plan`、封闭批次的publication工具，以及DOCS-RECORD-INTEGRITY-1的capture/inspect/audit脚本只用于按固定提交隔离回放。其旧路径和接受指纹属于历史身份；不能直接在当前树调用，也不将输出重定向后覆盖历史原件。日常维护使用上列现行检查入口；新写入工具另核具体任务、范围和消费者。

### 检查范围

文档检查使用Git跟踪及未忽略新Markdown的工作树内容，检查本地链接目标、目录索引、任务投影和选定现行版本合同。链接目标须属于这些文件或其父目录；机器上的空目录、`.DS_Store`和忽略产物不构成有效目标。

锚点、外站内容及任意HTML/MDX不由基础链接检查保证；改标题或跨页引用须另核实际目标。版本检查段由[配置](../../../scripts/docs/config.mjs)定义，不能全局替换历史版本或把未来规划当当前格式。

## 失败处理

目标缺失、索引/状态漂移、合同版本冲突或中央SHA失配，停受影响项并核实际差异；不批量刷新hash掩盖未读正文。例外只能精确到source、target和reason，不新增ignore、排除或降级规则来过门。

共享树出现其他Owner改动时保护原文件并交Owner协调，不reset、stash或覆盖；恢复只按已核映射和固定来源执行。证据不足或语义冲突仍交独立验收，退出码0不能代替零诊断或内容正确。

## 完成定义

正文、入出链、索引和对应review同步，必要硬门error/warning/info全部为零，并取得范围对应的独立裁定。静态文档通过不等于产品、运行、E2E、视觉、coverage或部署通过。

本页现行操作从文档模型和质量合同承接；旧封套、源全文及当时结论按需查[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/guides/documentation.md)，不作为新的执行结果。
