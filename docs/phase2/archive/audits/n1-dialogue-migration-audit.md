# N1-1 对话控制码退役审计

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: audit-report-v1 / 1.0.0

本页是 audit-report 的历史语义迁移。原始结论、日期、状态、数字、冲突和未知项保持在页内；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- 历史问题：07-15 N1-1 对话迁移结果与残留统计。
- 停止线：原稿中的 done/open/✅/❌/unknown 只属于其声明日期；本轮不重签。

## 范围与证据

- 固定来源：`655b8c687cb3e568c85fa53084d503e40b845e6a`；本篇源正文 67 行、SHA `5999356cc37b48e729fcb6b5d5a6a517dbfa57671e8c944ec17bbb4b21f01b1b`。
- 复核范围：固定 07-15；证据为 6722+135=6857→6858、14200 行、8637 IDs、26 variants、125 colors、残留表和 idempotent0。
- 证据边界：无当前迁移执行、runtime、E2E、视觉或 coverage 信用。

## 发现

| 维度 | 历史发现 | 当前边界 |
|---|---|---|
| 问题 | 07-15 N1-1 对话迁移结果与残留统计。 | 仅历史范围 |
| 观察 | 保留 6858 多 1 的原解释、18 减号/17 个 0xA7 描述、全角空格与 loader 旧工程豁免。 | 不升格当前事实 |
| 冲突 | 正文旧 current 将合法“写删冲突0”抓成 unresolved 的信号，作为旧审查误报保留。 | 保留并指向后继 |

## 结论

只确认当时迁移报告，不恢复开发期兼容，也不把旧合法删除冲突误报成实际 bug。

## 整改与复核

- 后继由当前 canonical/S 和 N1-1 历史任务复核；不运行退役迁移器。
- 下一入口：docs/phase2/specs/content-schema.md；docs/phase2/READ-FIRST.md
- 复核停止线：要重新打开任何红项，必须另有当前一手来源、合法输入、业务 oracle 和独立验收。

## 历史范围

- 源文件在 `655b8c687cb3e568c85fa53084d503e40b845e6a` 的历史快照；本次 only 文档结构/语义迁移，原日期轴不续期。

## 原始结论

- 只确认当时迁移报告，不恢复开发期兼容，也不把旧合法删除冲突误报成实际 bug。

## 当时证据

- 无当前迁移执行、runtime、E2E、视觉或 coverage 信用。；下方逐行 quote 保留原正文、链接、表格与未知项。

## 当前有效性

historical。正文旧 current 将合法“写删冲突0”抓成 unresolved 的信号，作为旧审查误报保留。

## 继任文档

docs/phase2/specs/content-schema.md；docs/phase2/READ-FIRST.md。继任入口不是本次产品或运行授权。

## 原文保全

固定源 SHA `5999356cc37b48e729fcb6b5d5a6a517dbfa57671e8c944ec17bbb4b21f01b1b`；以下只增加 quote 前缀，逆回读应得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # N1-1 对话控制码退役审计
>
> > 日期:2026-07-15。范围:`projects/pal` 全量迁移产物、baseline、content/reforge/editor 消费链。
> > 任务卡:[N1-1-dialogue-control-code-retirement.md](../../../ops/archive/tasks/done/N1-1-dialogue-control-code-retirement.md)。
>
> ## 结论
>
> 原版对话控制码已收拢到 `packages/migrate/src/legacy-dialog.ts`。生成工程只含
> `{kind:'dialog',cue:{rows:[...]}}`;content、Reforge 和编辑器不再解析 `$NN/~NN/-/'/@/"/()/\`。
>
> ## 迁移前口径
>
> | 范围 | dialog 命令 | 引用含旧控制码正文的命令 |
> |---|---:|---:|
> | 脚本 chunks | 6,722 | 1,234 |
> | 敌人 choreography | 135 | 12 |
> | 合计 | 6,857 | 1,246 |
>
> 任务卡原有的“6,722 / 1,234”只统计脚本 chunks。敌人战斗对白使用另一条迁移入口,本次统一接入同一
> decoder 后单列并纳入总门禁,避免口径看似不一致。
>
> ## 重生成后口径
>
> | 检查项 | 结果 |
> |---|---:|
> | 扫描 content JSON 文件 | 829 |
> | dialog 命令 | 6,858 |
> | DialogueRow | 14,200 |
> | 非 canonical dialog | 0 |
> | 被引用的正文 text id | 8,637 |
> | 确定性上下文变体 `.v-<hash>` | 26 |
> | 含语义颜色标签的被引用正文 | 125 |
>
> 命令数比迁移前多 1,是因为批中 `~NN` 按原版页终语义切成两个 cue,不是重复或膨胀。一个 cue 可含多个
> row,所以 14,200 个源行不再被 `join('\n')` 压成单字符串。
>
> ## 残留与合法性
>
> 对全部 8,637 个 `dlg.*` 值扫描:
>
> | `$NN` | `~NN` | `"` | `-` | `'` | `@` | `()` | `\` | CR/LF | 非平衡颜色标签 |
> |---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
> | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
>
> 用户选择 A 确定的是 legacy dialogue decoder 遇 `-` 时按 cyan toggle 解释；可达对话语料实际零命中。
> 原始 18 处 `-`（17 个站点）均属 0xA7 道具描述块，由描述管线原文写入 `items.json`，不经过对话 decoder；
> 字面负号原样保留才与原版及一阶段菜单直绘路径一致。
> `　` 行首缩进在“首个可见正文前设速”的分类中不算语义正文,但字符本身原样保留。
>
> ## 开场锚点
>
> `scene/s000/root/on-enter/stage-0` 三段数据为:
>
> 1. `dlg.0`:row `speed=112`,center cue `autoAdvance=342`。
> 2. `dlg.2`:row `speed=16`,speaker 李逍遥,cue `autoAdvance=457`。
> 3. `dlg.3 + dlg.4`:两 row 均继承并显式展开 `speed=16`,speaker 李逍遥,cue `autoAdvance=685`。
>
> 正文不含 `$` 或 `~`;速度、自动推进、说话人、行边界均可在编辑器直接查看和修改。
>
> ## 永久门禁
>
> - `legacy-dialog.test.ts`:控制码全集、narration quote、`~` 后死码、转义、光标、`　`、真中途变速
>   fail-loud、变体 id 正逆序稳定。
> - `translate-events.test.ts`:跨行状态、不同入口态的分支缓存、registry `callScript` 入口/离开态传播。
> - `dialogue-project.test.ts`:全 PAL canonical 形态、正文残留、换行、富文本平衡、开场精确数值。
> - content validator 默认拒绝 locale CR/LF;loader 只为旧工程结构升级保留软换行读取豁免。
> - 全量写盘后第二次迁移:`writes=0 deletes=0 conflicts=0`;脚本体积门禁未放宽。
<!-- original-source-quote:end -->
