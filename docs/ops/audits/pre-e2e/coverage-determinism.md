# 编辑器覆盖率确定性调查与修复回执

Status: historical
Last reviewed: 2026-10-16
Owner: Codex（原调查与文档治理；各原审查者身份保留）
Template: audit-report-v1 / 1.0.0

## 审计问题

保存2026-09-06固定 `2ac4a9de` 的editor覆盖率差额因果调查及 `7c447c38` 后继回归收口：合法无滚动容器拖动中的自动滚动帧是否被明确调度，以及补测是否有可判别反控。原生产guard正确，本卡不是产品缺陷修复或当前coverage执行报告。

## 范围与证据

原环境为Node22.19.0/pnpm10.29.2/Vitest与V8 provider4.1.7。修复前editor fast213生产文件/177测试文件/1600项，identity/execution digest保留原文；正式回归从reorder23→24。候选执行者、GLM自测、Codex独立复跑、Kimi终审和用户确认分别按[归档任务卡](../../archive/tasks/done/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)读取，旧三签不恢复为当前新门。

原 `reorder.tsx:730` 的 `if (!selected) return` 保护合法scrollOwners=[]；hover/auto-scroll不发重排命令，之后有效drop一次。原受控modal有容器测试不能覆盖无容器返回；源位置与原指标均限定当时revision，不标成今天代码行号或当前测试基准。

## 发现

| 发现 | 原直接证据 | 可继承边界 |
|---|---|---|
| 无容器帧时机未被明确覆盖 | 原mouse/touch/pen move后立即up，RAF可先跑或取消 | 先补业务回归，不能删合法guard、全局同步RAF或加sleep凑绿 |
| 同范围的hold/flush有唯一差额 | 两组23/23；扩到editor fast1600/1600，只有statement313与branch127的返回分支0→1 | editor covered23455→23456/31407、branch18168→18169/27329；行/函数/分母不变，不是正式gate或七包full |
| 正式回归与独立反控有判别力 | +94行无容器帧合同，原23断言字节保留；Codex/Kimi各删guard产生selected.owner TypeError，恢复通过 | 原24定向、539files6247 check、editor fast1601及严格七包fast609/5762各有旧执行范围 |
| 基线维护不改变生产覆盖率 | 仅测试数/摘要7叶值更新，精确covered/total和生产范围不变 | 未重跑full coverage，旧临时探针不升正式CI合同 |

## 结论

原相同树/identity下只改变帧时机即可复得一条statement和branch差额，支持该次因果解释；六次串行绿只是有限诊断，不是概率或多数证明。`/tmp/cov2.log`、`cov4.log`没有保存逐文件报告，不能追认所有早期失败或“clean HEAD10次/约1/6”统计。

本次只复核历史文档及197行探针/配置源码，未运行其命令或产品/旧tests/coverage/浏览器。十月[Q3c Workbench174分支](../../archive/tasks/done/CODE-QUALITY-3c-editor-coverage-determinism.md)是另一调查，不能把两个guard/时点/总数合并，也不能由本回执关闭后续差额。

## 整改与复核

再次出现覆盖差额应保存该次SHA、范围和逐文件报告再定位，不降门或归给已关闭分支。保留[历史探针](tools/probe-editor-coverage-timing.mjs)与[加载配置](tools/probe-editor-coverage-timing.config.mts)作为producer源码，Owner Codex；CLI仅接受可选 `--full`，其含义是整个editor fast而非七包full。它检查packages/scripts/lock干净且只内存改测试调度，输出独立临时目录，不自动恢复别人文件；本轮未执行。

原临时证据根与两个永久探针复跑目录，以及cov2/cov4，本轮实际存在性检查均missing-not-recovered；缺失不抹掉旧结论，也不能声称重新读raw。保存仓库producer、旧路径/digest/执行者与下方完整原稿，不提交完整coverage HTML/PNG或补造当前执行。调用方是本历史报告及人工历史CLI，不接入正式CI；后继新取证按[现行工作流](../../agent-workflow.md)另卡。

以下保留原有标题入口；其具体原句仍在完整历史原稿，新增导航不恢复原命令或build。

### 修复收口

原内容见下方完整原稿；当前组织见[发现](#发现)。

### 结论与因果证据

原内容见下方完整原稿；当前组织见[结论](#结论)。

### 取证方式

原内容见下方完整原稿；当前组织见[范围与证据](#范围与证据)。

### 边界与替代解释

原内容见下方完整原稿；当前组织见[结论](#结论)。

### 历史复现与证据位置

原内容见下方完整原稿；当前组织见[整改与复核](#整改与复核)。

### 后续边界

原内容见下方完整原稿；当前组织见[整改与复核](#整改与复核)。


## 历史范围

原2026-09-06、产品/测试基线2ac4a9de、最终候选7c447c38；修复前23项和修复后24项分开，old fast/full词义及环境/digest不改。本轮文档迁移不更新任何coverage或旧测试。

## 原始结论

合法无容器RAF返回需独立受控帧回归，原生产guard不删；正式补测及非作者反控关闭该已知缺口，不证明其它不确定性消失。原23断言保留、基线7叶值与全部covered/total不变均按原卡声明。

## 当时证据

全部原表/命令/环境/路径/计数在完整quote中。五处临时日志/目录本轮仅查存在性且全部不存在，没有回读原raw或重跑探针。仓库两producer源码全文138+59行已读，字节未改，不把源码静态阅读当历史执行复验。

## 当前有效性

historical。原三方accept与用户确认只限该回归收口；临时hold/flush、--full和六次诊断不升当前正式门，也不追认其它历史失败。当前是否还有差额须有新候选/范围/逐文件报告。

## 继任文档

[原归档卡](../../archive/tasks/done/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)解释九月收口，[十月Q3c](../../archive/tasks/done/CODE-QUALITY-3c-editor-coverage-determinism.md)另有Workbench回归；新执行按[测试治理](../../../testing/governance.md)与现行流程准入。无待执行旧Agent提示词。

固定原稿来自revision `22eead43a6c825e1345feb92441e09d340d22c18`，Git blob `c97b397f4ba9d22ea772cfc73c0779e47a744251`；保留所有原日期、结论和证据边界。

<!-- original-source-quote:start -->

> # 编辑器覆盖率确定性调查与修复回执
>
> 日期：2026-09-06；Owner：Codex；产品/测试基线：`2ac4a9de`，取证前工作树干净。
> 状态：**已修复并收口（2026-09-06）**。
> 任务：[TEST-COVERAGE-DETERMINISM-1 r1](../../archive/tasks/done/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)，终审候选 `7c447c38`，三席 accept 齐；用户确认签字后由 Codex 汇总 done。
>
> ## 修复收口
>
> - `reorder.test.tsx:860` 新增一条无滚动容器的独立受控帧回归（+94 行）；排队一帧、触发即出队、
>   无滚动/无提前提交、正确 drop 一次与 finally 清理均已验证。旧 23 项断言逐字节保留，生产组件不变。
> - Codex/Kimi 各自独立隔离负控制：仅删 `reorder.tsx:730` 的 guard，新回归均因 selected.owner TypeError
>   exit 1；完整实现均 exit 0。不是只凭重复全绿断定测试有效。
> - 定向 24 项、完整 check 539 文件 / 6,247 项通过；editor fast 213 生产文件 / 1,601 项，
>   statements 23,456/31,407、branches 18,169/27,329 与高基线一致；严格七包 fast 为 609 生产文件 / 5,762 项。
>   GLM 自测、Codex 独立复跑与 Kimi 终审的各自验证边界见归档卡，不混写执行者。
> - 基线只更新测试数量及摘要等 7 个叶值；所有包/全仓精确 covered/total、生产范围均不变。
>   该卡未重跑 full coverage，纯测试维护无需浏览器验收；此次文档收口不重跑未变的重型检查。
> - 已知帧覆盖缺口关闭，不代表其他潜在不确定性都已消失。再次回退仍停线定位，不取多数、不降门槛。
>
> 以下保留 `2ac4a9de` 修复前的取证、计数与探针用途，不将它们误标为当前回归清单。
>
> ## 结论与因果证据
>
> `packages/editor/src/ui/design-system/reorder.tsx:730`：
>
> ```ts
> if (!selected) return
> ```
>
> 这是自动滚动回调的合法保护分支。有效拖动可以没有滚动容器（scrollOwners 为 []），此时该帧应直接返回，
> 不滚动页面、不发送重排命令，之后有效 drop 仍可正常提交。容器收集见 :382，回调早期有效性检查见 :699，
> 调度见 :737；[设计系统合同](../../../phase2/specs/editor-design-system.md)规定 hover/auto-scroll 零命令、drop 最多一次。
>
> 既有 `reorder.test.tsx:370` 的 mouse/touch/pen 用例未控制 RAF，pointermove 后立即 pointerup，
> 帧可能在拖动结束前运行，也可能被取消。`:769` 已有受控帧测试，但验证的是**有可滚动 modal 容器**，
> 没有明确覆盖这个返回。生产实现正确，不能删 guard 或改变自动滚动语义来消除覆盖率波动。
>
> ## 取证方式
>
> 1. 先固定 Node `22.19.0`、pnpm `10.29.2`、Vitest/V8 provider `4.1.7`，读取当前 fast 真源配置。
>    editor 为 **213 个生产文件 / 177 个测试文件 / 1,600 项**，测试 identity digest
>    `014259d9153f6366574ce5c88db1e43975a0f520971919fe69bb09faf3819acc` 与 execution digest
>    `a505eb47698d206d1eae4db93219382e73a63c4ee55190171bddcedd6ef9626c` 均与提交基线一致。
> 2. 预先限制最多六次串行原样 editor fast 诊断；六次全绿、逐文件 covered/total 相同，随后停止。
>    不以此当作概率证明或多数通过；逐次 statement 命中次数提示需要进一步控制帧时序。
> 3. 临时日志钩子找到真实测试中的无容器返回；正式因果对照不注入生产源码，只在内存加载
>    `reorder.test.tsx` 时增加排队/取消 RAF 的测试控制。hold 不推进无容器帧；flush 在 mouse 有效拖动内、
>    pointerup 前仅推进一帧。两个配置都保留全部原断言。
> 4. 单文件两组均 **23/23 通过**：返回语句 statement 313（730:19）从 0→1；branch 127（730:4）
>    的 true 分支从 0→1。其余语句/分支的 covered 布尔值不变，行/函数计数不变。
> 5. 全 editor fast 范围两组均 **1,600/1,600 通过**，分母与文件集合完全相同；逐文件差异唯一是 reorder.tsx：
>
> | 模式 | editor statements | editor branches | reorder statements | reorder branches |
> |---|---:|---:|---:|---:|
> | hold | 23,455 / 31,407 | 18,168 / 27,329 | 599 / 651 | 444 / 535 |
> | flush | 23,456 / 31,407 | 18,169 / 27,329 | 600 / 651 | 445 / 535 |
>
> 两组 editor lines 均 21,199/27,409，functions 均 5,907/8,030；flush 恰回到已提交的高基线。
> 未运行 ratchet，未修改任何基线、生产源码、正式测试、锁文件或全局配置。没有使用 stash/checkout。
> 这是诊断调度干预的结果，**不是未经修改测试配置的正式 fast gate，也不是七包 full coverage**。
>
> ## 边界与替代解释
>
> - 相同树、相同测试、相同生产文件集合，只改变帧时机即可精确复得差额，排除了本次对照的范围漂移、
>   舍入或聚合算法解释。返回分支的触发本身不涉及存档代码；editor 相关源/测试在 SAVE-PREFLIGHT-1 前已存在。
> - `/tmp/cov2.log`、`/tmp/cov4.log` 的历史差额与本次一致，但没有保存其逐文件报告；
>   **不追认每次历史失败都来自这一个分支，也不追认“clean HEAD 10 次/约 1/6”统计**。
> - 未发现需要改变产品行为的证据。先补明确业务回归，不全局同步 RAF、不延长 sleep、不降低门槛。
> - 后续若仍出现差额，保留新失败、继续逐文件定位，不能因为本分支已补测就一概忽略其他不确定性。
>
> ## 历史复现与证据位置
>
> 以下命令只对应修复前的 23 项基线。当前树已是 24 项，旧数量/差额断言不再作为当前门禁；
> 不要为让历史探针绿色而修改正式回归或回退共享工作树。当前维护使用 `pnpm coverage:fast`。
>
> ```sh
> # 快速因果对照：既有 reorder 23 项，两个帧时机各跑一次
> node docs/ops/audits/pre-e2e/tools/probe-editor-coverage-timing.mjs
>
> # 同一干预扩到整个 editor fast 范围（不是 pnpm coverage:full）
> node docs/ops/audits/pre-e2e/tools/probe-editor-coverage-timing.mjs --full
> ```
>
> 探针与[临时加载配置](tools/probe-editor-coverage-timing.config.mts)只在内存转换一份测试，运行输出写独立临时目录；
> 产品树有未提交变化时拒绝启动，不自动还原文件。每次保存 SHA/环境/源摘要、命令、测试 JSON、覆盖率 JSON 与差异。
> 它断言的是修复前缺口，现已不再作为当前通过条件；属于历史审计证据，不作为正式回归或 CI 门禁，源码未改。
>
> 初始完整取证：`/tmp/type-pal-editor-cov-det.LMxDo9/`，包含 `run-1..6`、`timing-hold/flush`、
> `full-hold/flush` 与各次命令/差异。永久探针的快速复跑见本机
> `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-editor-coverage-timing.IdnFzT/`。
> 永久探针全 editor 双调度复跑见同一临时根目录的 `type-pal-editor-coverage-timing.AckhLk/`，
> 两组 1,600 项全部通过，计数与表格逐项相同；探针格式/导入整理后仍可复现。
> 临时目录不承诺长期存在；持久结论与复跑源码留在仓库，不提交完整 HTML/PNG/海量 coverage 产物。
>
> ## 后续边界
>
> 本卡无需下一位 Agent 交接。若后续又出现覆盖差额，保留该次 SHA、范围及逐文件报告再定位，
> 不能将任何新异常一概归到本卡或以本卡完成为理由忽略。存档隔离及其他审计缺陷继续按各自任务推进。
