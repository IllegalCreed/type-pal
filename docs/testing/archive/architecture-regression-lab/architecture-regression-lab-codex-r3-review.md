# ARCH-REGRESSION-LAB-GLM-1 — Codex 三轮独立接收

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核第三轮最终候选的32项实际执行能否支持40条账及十二组合同；不复用二轮SHA的33项结果。

## 范围与证据

最近授权主线合入点a2415868用于贡献范围；09-25新鲜JSON九文件32/32，原机账40=38/1/1，六图完整hash重算但账只存前缀。启动反控仍单针，独立类型门未交。

该篇一手文档为本页完整保留的29行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 2c0afeee6dcdb0de671a3b65da43fbaf489954f2。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

11条fullName与实际执行不符，删掉的G08-03还在账中；36项/537文档/V04 reproduced-defect等旧注释未更新。verify已只读，却没读Vitest JSON验标题/status/执行数。

G03旧listener和保存IO未观察，G04新body计数不见证旧草稿提交，G05没有真实tick；G06合法typed夹具/方向、G07目标消费者、G08异常与回调输出、V组操作矩阵仍有反证。

## 结论

十二组暂不按完整合同转正式，整批counter、原任务draft；窄正控可保留。32/32不是33项，单针不证明其余组鉴别力。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：四轮须清掉真实执行名错配和已删条目，登记完整hash，并补真实caller/oracle；只读工具本身不能代表证据闭环。原main合入差异和贡献零产品修改继续分栏。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 机械事实与当前阻断

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 十二组决定

原文第12行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-25；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 bc8613d17a15262bddb01a1a47b3669428d22b02。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 — Codex 三轮独立接收
>
> 2026-09-25；候选 `bc8613d17a15262bddb01a1a47b3669428d22b02`。结论：**counter，十二组均暂不以完整组合同转正式测试；保留已证的窄正控，任务仍为 draft。** 这轮接收只针对最终候选，不把二轮旧 SHA 的结果冒充当前验证。[二轮反证](architecture-regression-lab-codex-r2-review.md)保留为历史。
>
> ## 机械事实与当前阻断
>
> - `git diff a2415868..HEAD --name-only` 仅在 `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/**`；该合入点后 GLM 自身 packages/scripts 零 diff。**但** `git diff a3ceaf05..HEAD -- packages/ scripts/` 非空，含中途合入的 Codex/Gemini/Grok 主线修改；只能说起点 `86e928b5..a3ceaf05` 冻结零漂及 GLM 自身增量零产品改动，不能说最终树相对 `a3ceaf05` 零 diff。
> - 本席 `env -u NODE_COMPILE_CACHE pnpm exec vitest run --config .../candidates.vitest.mts`：**9 文件、32/32**，不是交付文字的 33 项。独立 JSON 报告 `/tmp/codex-glm-r3-vitest.json` 同为 32/32；机账仍为 **40 条（38 candidate-green / 1 existing-proof / 1 blocked）**，其中候选测试引用 32 条，但 **11 条 fullName 与本次真实执行名不符**（把旧 ` > ` 分隔符正规化后仍不符），G08-03 已从测试文件删除却仍在机账作执行证据。`results.json:832-862` 的命令仍写“36 项”、旧 537 文档数与过期 V04 reproduced-defect；README/receipt 也仍报旧 39 条 36/1/1/1。故 `verify.mjs` PASS 不能代表最终树证据闭环。
> - `tools/verify.mjs` 现在确为**只读**，重算 40 条小计；但 `:64-91` 只查测试文件存在与截图 `sha256_16` 前缀，没有读取 Vitest JSON 验 `fullName`/status/执行数，也不核命令退出码。六张截图均存在，本席重算完整 SHA-256，其前缀均与机账一致；机账仍只存 16 位，未满足工作包的完整 SHA 登记。
> - `node tools/red-control.mjs`：detected，exit1/1执行/1失败/业务 AssertionError、注入见证1、产品 hash 不变；本席产生的唯一 `.tmp-red-HOXY97` 已移至 `/tmp/type-pal-arch-lab-red-HOXY97`，候选树干净。其后全目录 Biome 20 文件 exit0，`node scripts/docs/check.mjs` PASS，diff 检查 PASS。负控仍只覆盖启动小样，不证明各组的新合同。候选目录也未交独立 TS/TSX typecheck 配置/结果。
>
> ## 十二组决定
>
> | 组 | 本轮有效进展/可保留项 | 正式转正前剩余 counter |
> |---|---|---|
> | G01 | 笔划正常提交与三种取消零写入、取消平移后仍可绘制 | `g01-map-gesture.test.tsx:257-280` 仍只数通知，未证实际选区状态；平移 view 取消结果未证。 |
> | G02 | 活跃笔划换同/异 map 会话后的两侧 tiles 正控 | G02-03 仍只比选区通知，不比新会话选区或实际提交状态。 |
> | G03 | 挂载上屏及旧会话卸载 fail-loud 可保留 | `g03-app-lifecycle.test.tsx:198-212` 发 Cmd+S 后直接调用旧 session.dispatch 并断言它抛错；**即使快捷键监听残留、保存 IO 已发生也会绿**，不能称键盘/保存 owner 收口。derivedStore/临时试玩生命周期亦未测。 |
> | G04 | 弹层 entered 后确认一笔、关闭零笔可保留 | `g04-script-draft.test.tsx:113-125` 标题称旧草稿不写回新对象，代码只数新 body 行；注释自己承认旧草稿覆盖待浏览器确认。G04-01 仍只是 props 替换，不是 session undo/redo。 |
> | G05 | stop 后 mode/path/view 的局部保真；`waitFlow` 已改 `satisfies` | `g05-playback-scope.test.tsx:58-69` 新源后立即再 stop，仅推进 fake timer，不调用驱动 wait 的 `Playback.tick()`（生产 `playback.ts:597-652`）；旧源复活未证。G05-04 手工置 `onUi=undefined` 不是工作区 unmount。 |
> | G06 | `checkEnemyOnDefeatedCommands` 的非法 branch 确实触达 enemy→author condition 校验（源 `enemy-script.ts:576-600`），比二轮直接调 author 更窄有效 | G06-05 仍 `as never`，错误断言只含 owner 前缀；G06-01 的实际 flow 无所称 onDefeated 嵌套，G06-02 未证明作者→敌方的完整调用链。须收窄标题/范围或补合法 typed caller。 |
> | G07 | 装备效果改经生产 `writeEquipmentEffectField`，比直接赋槽更真实；库存实例隔离正控可留 | `g07-core-boundaries.test.ts:12-23` 的 map 读写仍都来自 scene-system；`:36-42` 仍只读 equip getter，没有调用 `battle-opcodes.ts:343` 的消费者。不能宣称 scene→event 或 equip→battle。 |
> | G08 | 非法 opcode 确实登记至少一条 gap，后续合法调用可运行；可收窄为“报告非空/下次可用” | `g08-conversion-isolation.test.ts` 现在只有 01/02/04 三项，机账仍有 G08-03。G08-02 未见证 sound 回调执行/产物差异，且标题仍称“回调轨迹”；G08-04 不是异常 throw 路径，旧标题和机账未同步。 |
> | V01 | 旧三张截图仍显示角色名改动及恢复 | 未给 Enter/blur 双提交次数、归焦/键盘链或其余代表表单；缺头像素材不能充资源正控。 |
> | V02 | 旧 PanelResizeHandle 测试可作 existing-proof；720px 角色页可见 | 未测非空场景/地图/脚本三宽度、实际分隔条与 zoom；不能称工作区矩阵通过。 |
> | V03 | 无效 objectId 深链回退的窄事实 | 与一次性读取失败、A→B 乱序、解除故障重试三态无关。 |
> | V04 | 脏页 beforeunload 中止的现象已由 Codex 证为预期；缺合法 sprite 二进制的环境阻断可保留 | `results.json:731,758,856` 仍保留“覆写回 actor/待归因/ reproduced-defect”旧话，README/receipt 同样旧；无自包含合法媒体/decoder 正控或 fit/1:1/替换操作。 |
>
> 返工只动 GLM 实验目录及自身机账/回执，不改产品、正式测试、基线或 Codex 原审查。**先让 JSON 与真实 32 项及 40 条分类逐项一致**，让 verifier 只读且真正读取 JSON/完整 hash；然后对不能触达目标链的组主动降级或补真实 caller/状态反例。没有必要为了保住“十二组全部 green”再补弱测试。候选不合 main、不计官方覆盖率、不标 done。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 2c0afeee6dcdb0de671a3b65da43fbaf489954f2 / SHA256 91924061fd4a2079397442c5907f8f123d701795d6344c40feb5e7dc55af92f2。源中2026-09-25日期及 bc8613d17a15262bddb01a1a47b3669428d22b02 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-25候选的审查结论有效：十二组暂不按完整合同转正式，整批counter、原任务draft；窄正控可保留。32/32不是33项，单针不证明其余组鉴别力。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r4-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。
