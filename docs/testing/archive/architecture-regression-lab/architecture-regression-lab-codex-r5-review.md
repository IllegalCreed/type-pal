# ARCH-REGRESSION-LAB-GLM-1 · Codex 五轮独立接收

Governance Owner: Codex（历史文档治理；非作者独立语义验收后根接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核32项执行与39账是否是一对一独立证据，及清理后的目录门能否覆盖反控产生的污染。

## 范围与证据

相对四轮candidates/fixtures零改；新鲜32/32、39账37/1/1、六图完整SHA一致及启动反控为该轮窄事实。最近8217c7ad合入点与原生产冻结分别归因。

该篇一手文档为本页完整保留的36行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 3db1dbd0e271b4536c34bc89b26b466ce79ee4ef。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

G04-02与G04-04错引同一完整测试标题；verify只查passed集合存在，不拒绝同一执行被计两次。receipt仍有36项、旧G04/G08组数与已撤回V04“产品缺陷”。

反控在configs内创建不清理.tmp-red目录，移出后Biome exit0仍有2条optional-chain warning，直接续跑会被临时文件污染。G03保存IO、G05换源时序、G07消费者、G08回调/异常等原业务缺口未变。

## 结论

十二组仍counter。32绿不等39次独立执行，清理临时目录后的局部门不覆盖未清理污染；历史2 warnings不能改为今天零诊断。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：六轮应修G04真实标题映射、缺参执行身份和临时清理；未到业务层的条目降为窄证据或补真实链，不再仅改小计。原观察到的回执错误保留历史。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 独立复跑通过的窄事实

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 仍阻断接收的证据矛盾

原文第12行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 十二组去向

原文第19行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-25；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 b403efd375cddce284b6968de8075c4e72953c33。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 · Codex 五轮独立接收
>
> 2026-09-25；候选 `b403efd375cddce284b6968de8075c4e72953c33`。结论：**counter，十二组仍不能按原工作包完整合同转正**。本轮相对四轮候选 `494f9b5d` 没有修改任何候选测试或 fixture；仅改执行 JSON、机账、回执、verify，并合入 Codex 授权的 main。下表承认局部可用的证据，不把 32 个绿测试说成十二组完成。
>
> ## 独立复跑通过的窄事实
>
> - 工作树干净且 tip 等于远端。`86e928b5..a3ceaf05` 的 `packages/ scripts/` 原冻结 diff 为空；最近主线合入点 `8217c7ad..b403efd3` 的 GLM 增量只有实验目录四文件，`packages/ scripts/` 为空。原 `a2415868..HEAD` 的白名单命令含 Codex 授权主线变更，不能当 GLM 本轮越界，也不能报告为全空。
> - `npx vitest run --config docs/testing/archive/legacy/batches/glm-architecture-regression-lab/configs/candidates.vitest.mts`：9 文件 32/32 绿；重新生成 `/tmp/codex-glm-r5-candidates.json` 后用 `tools/verify.mjs` 对账显示 `PASS`、32 passed、39 条。`tools/red-control.mjs` 显示 detected（exit1、一项执行/失败、业务 AssertionError、注入命中、产品 hash 不变）。
> - 六张 `/tmp/type-pal-glm-regression-lab/` 截图存在，逐张重算完整 SHA-256 与 `results.json` 精确相等。本人目视抽查 V01-02/V02-01/V03-01/V04-01：角色姓名界面、720px 角色页、无效 object URL 后角色页及角色页上的“视图”菜单可见；图片本身不能证明六类表单、三工作区分隔条、异步恢复或精灵媒体矩阵。
> - 将本次 `red-control` 产生的 `.tmp-red-*` 从实验目录移至 `/tmp` 后，实验目录 Biome exit0（有两条非阻断 optional-chain warning）、`node scripts/docs/check.mjs` PASS、`git diff --check 8217c7ad..HEAD` PASS。**反控脚本仍在 `configs/` 下创建且不清理临时目录**（`red-control.mjs:32,73-89,127`），直接接着跑目录 Biome 会因生成文件失败；此前同类环境污染问题未收口。
>
> ## 仍阻断接收的证据矛盾
>
> 1. `results.json` 的 G04-02 与 G04-04 都引用同一个 `g04-script-draft.test.tsx:69` 的完整标题；`G04-04` 真用例位于该文件 `:113-125`，只断言新 body 变为两行，没有提交旧草稿后的业务结果。`verify.mjs:82-101` 用 passed 标题集合做存在性检查，不核 ID→file/fullName **一对一**，因此同一绿测试被计两次仍 PASS。`results.json` 39 条不能冒充 39 条独立执行证据。
> 2. 人类回执 `receipt.md:16,20,24,36-37,45,53` 仍写 G04 三项、G08 四项、V04 reproduced-defect、V04 因该“缺陷”进不了页面、候选 36 项以及旧的 `verify.mjs a3ceaf05` 命令；本轮实际 G04 四条账但仅四个测试、G08 三项、V04 预期 beforeunload、32 项。机账 `results.json:808,829` 也保留旧“36 项”和已撤回的 V04 reproduced-defect 文字，与其结构化状态相冲突。不能只信顶层 39/37/1/1 小计。
> 3. `verify.mjs:27-35` 对缺命令参数默认使用入仓执行 JSON，虽可用新鲜 JSON 复验，但不再证明**本次**执行；`:47-55` 把 `a2415868..HEAD` 的生产 diff 降为 INFO，未用最近授权合入点硬核 GLM 自身白名单；`:91-101,121-131` 不核唯一映射、执行总数、命令 cwd/exit，也未给之前要求的错标题/零执行/普通 Error/超时判据自测。`PASS` 目前只证明若干标题在该 JSON 中曾通过。
> 4. 业务用例本轮零改，四轮审查中已经定位的完整合同缺口仍在。直接复读确认：`g03-app-lifecycle.test.tsx:198-213` 的 Cmd+S 只发键并断言旧会话改名抛错，未观察保存 IO；`g05-playback-scope.test.tsx:58-73` 新源启动后立即 stop；`g07-core-boundaries.test.ts:19-24,36-43` 没实际调用 event-system map consumer 或 battle opcode；`g08-conversion-isolation.test.ts:49-71` 回调不见证调用，所谓异常输入只登记 gap 不抛。V02 截图是角色页而非三工作区；V03 是无效 objectId 而非读取失败三态。
>
> ## 十二组去向
>
> | 组 | 可保留的窄证据 | 完整组合同裁决 |
> |---|---|---|
> | G01 | 瓦片笔划正常/三类取消与取消后存活 | counter：选区拖动仍以通知计数替代完整状态；平移 view 结果未证。 |
> | G02 | 换会话/换地图后两张瓦片图未被迟到 up 写入 | counter：G02-03 只查通知/DOM，不核新会话选区业务状态。 |
> | G03 | App 挂载/重挂载的项目名接线 | counter：Cmd+S 未见真实保存 IO，derivedStore/试玩 owner 范围未证。 |
> | G04 | 弹层确认与关闭的局部行为 | counter：旧草稿外部替换后确认/undo 结果未证；G04-04 机账错引 G04-02。 |
> | G05 | 单个 Playback 的 stop、停止后 tick 冻结 | counter：新源立即 stop 和手动 `onUi=undefined` 不等于工作区换源/卸载。 |
> | G06 | enemy→author 的简单叶与错误 path | counter：未证 author→enemy 的合法 typed 嵌套调用；`g06-validation-crosscalls.test.ts:16-17,32,48` 仍以 `as unknown as`/`as never` 绕过 fixture 类型。 |
> | G07 | 背包实例隔离、装备写入与 getter | counter：`getCurrentMapNum` 是 scene-system 直接函数，未调用 event-system 消费者；装备未进入 battle opcode。 |
> | G08 | 同输入重复转换与输入保真 | counter：sound 回调未执行，非法操作码只产 gap 非异常，所称回调/异常隔离未证。 |
> | V01 | 角色姓名一组截图与局部键盘结果 | counter：物品/技能/敌队/战场/模拟器及焦点矩阵未证。 |
> | V02 | 720px 角色页面截图；旧 PanelResizeHandle 用例仅为 existing-proof | counter：场景/地图/非空脚本工作区、真实拖拽和缩放矩阵未证。 |
> | V03 | 无效 objectId 深链回退页面可见 | counter：受控读取失败、重试、A/B 迟到与恢复均未证。 |
> | V04 | 脏页 beforeunload 为预期保护；合法精灵字节缺席属环境阻断 | counter：媒体 fit/缩放/替换与引用刷新未执行；回执仍误写产品缺陷。 |
>
> **处理界限**：本卡仍 `draft`，不合候选、不计官方覆盖率、不标 done。下一轮先纠正机账/回执/核验器的真假对应，再将未达完整合同的条目降成窄证据或补真实业务链；不得靠改标题/改小计取代测试。GLM 是贡献者，不作为自己的独立终审；Kimi 本队列豁免。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 3db1dbd0e271b4536c34bc89b26b466ce79ee4ef / SHA256 78a23d15b24bd1d9c87b44b7fd2d93656fb6c8bb3354f438d8354cb235c92d66。源中2026-09-25日期及 b403efd375cddce284b6968de8075c4e72953c33 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-25候选的审查结论有效：十二组仍counter。32绿不等39次独立执行，清理临时目录后的局部门不覆盖未清理污染；历史2 warnings不能改为今天零诊断。 2026-10-16本篇文档迁移已获非作者history_cards_c_tail语义验收，根Codex接收；配对r10 JSON的1.4原生保真pilot另获独立验收。这只接收文档与机器格式，不改变原历史counter或授产品、运行信用。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r6-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。
