# 编辑器连续播放与逐指令单步

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 EDITOR-PREVIEW-STEP-1（基点 `2f59be7f`，2026-09-28 用户确认交互、Codex 实施与验收）的合同与实现回执：同一按钮播放/暂停/恢复、对话阅读时长 `min(8000, 1200+Unicode 码点×80)`ms、单步进入暂停模式等当前合同；不新增按钮、不改游戏内对话或工程数据。Codex 已核定 done。

## Scope

- 对象=编辑器预览连续播放与单步控制；根因=旧 canonical 运行器把阶段/命令/尾安全点接同一暂停 gate（首步被内部结构门吞掉）+旧 UI 首次单步只做 paused 启动未发步请求。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 实现边界 | ScriptRunnerCore 可选 beforeStep 调试钩子（仅编辑器接入） | 原宿主 gate/abort 复核/保存安全点 | 调试钩子后仍经宿主 gate 与取消检查才通知/执行；正式游戏不设钩子、路径不新增异步等待 | 普通对话自动计时只在 Playback.tick 运行，不改正式 runtime 对话确认政策；不改 schema/存档/资源 |
| 回归 | 新 stepping 10 项+UI 1 项+runner 4 项 | 定向 editor 12 文件 91 项、reforge 相邻 3 文件 77 项 | 夹具过当前正式守卫、原输入深快照；旧「单步代选」按新合同改为明确提交；首轮新六项全部业务红（/tmp/codex-preview-controls-red.log） | 11 正控+11 精确 AssertionError 业务红、正式源码 hash 不变；六针维护 resume 锚+五新针（移除步进钩子/偷对话/代选/文本 ID 代替翻译计时） |
| 浏览器核验 | 6010 正式 s001 独立标签 | 首次单步停第 1 条（playMusic 预览日志桩）；恢复后第 3 条第一句、未点下一句自行到第 16 条；第 23 条暂停后跨越阅读上限文字完全相同、单步只到第 24 条且保持暂停 | 截图 build/verification/preview-controls/paused-dialogue.png（SHA-256 2146d492…4a9） | 不修改作者内容/不保存/不操作用户原标签；分支选项未在真实 PAL 场景构造（由生产控制器+DOM 禁用断言覆盖）；不是 001/002 剧情/音轨或完整 E2E 验收 |
| 统一门 | 完整 check→官方 ratchet→保护 2f59be7f 单次 strict-fast | pnpm | check 10,191 项（editor 3,299/reforge 1,876）、lint 2,392 文件 0/0/0；fast 9,730 项/730 文件 | 全仓 B47,667/63,393=75.19%；产品新增分母 32、覆盖分子 30（非纯补测收益，如实登记）；其余五包基线不变 |

## Results

- 当前界面未接行高亮：保留 activePath，显示「当前第 N 条指令」；不冒称行高亮或音乐真实播放已实现。

## Evidence

- 证据路径：本回执正文（quote 保全）；复跑 `node docs/testing/archive/legacy/batches/codex-playback/mutants.mjs`；最终与逐针日志按原文 /tmp、/var/folders 时点。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 实施与验收 | 2026-09-28 | beforeStep 调试钩子+UI 单步 | done（三门通过） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 preview-controls 合同与验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

done：当前合同（播放/暂停/单步/阅读时长/选项禁用）+根因修复+11 针+浏览器核验+三门。

## 当时证据

合同细节、根因、针清单、截图 SHA 与门数字在 quote 保全。

## 当前有效性

historical。合同按用户 2026-09-28 确认口径；当前行为以现行编辑器为准。

## 继任文档

当前编辑器预览行为以现行实现与 canonical 合同为准。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `c0d625e087d4f601098b900ed48f139a48a948137c4b60faf40d2fafd35f26f6`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 编辑器连续播放与逐指令单步
>
> [任务卡](../../../../../ops/archive/tasks/done/EDITOR-PREVIEW-STEP-1-command-gates.md)，基点2f59be7f；
> 2026-09-28用户确认交互，Codex实施与验收。不新增按钮、不改游戏内对话或工程数据。
>
> ## 当前合同
>
> - 同一个按钮显示“播放/暂停/恢复播放”。普通对话自动推进，阅读时长为
>   `min(8000, 1200 + Unicode码点数×80)`毫秒，使用实际locale文本，服从0.5/1/2/4倍速。
>   暂停冻结对话剩余时间；“下一句”可提前确认。
> - 单步进入暂停模式，初次点击即请求第一条指令，最后一条完成后不需再点空的结束门。
>   分支、共享调用及子命令各算一个可步进指令；阶段/状态转换及安全点不吃空步。
>   已开始的移动/淡幕/等待完成当前动作后停，连点不囤积额外命令。
> - 对话中单步先关闭当前句，再放行下一条脚本指令（可能是清框而非对话），并保持暂停。
>   是/否只接受明确选择，单步按钮在选项期间禁用，控制器也拒绝用单步代选。
> - 当前界面未接行高亮；保留activePath给已进入命令，显示“当前第N条指令”提供音乐/状态等
>   无明显画面变化指令的反馈。不冒称行高亮或音乐真实播放已实现。
> - 重置/切源清除步进请求和阅读时钟，旧异步收尾不得推进新源。
>
> ## 根因与实现边界
>
> 旧canonical运行器把阶段/命令/尾安全点均接入同一个暂停gate，首步因此被内部结构门吞掉；
> 旧UI首次单步又只做paused启动，未发出一步请求。旧step在running态也未进入paused。
> 现在ScriptRunnerCore添加可选beforeStep调试钩子，仅编辑器接入：所有原宿主gate、
> abort复核与保存安全点保持；调试钩子之后仍经宿主gate与取消检查才通知/执行命令。
> 正式游戏未设置该钩子，路径不新增异步等待。
>
> 普通对话自动计时只在Playback.tick中运行，不修改正式runtime的对话确认政策；
> SceneScriptWorkspace把现行locale交给Playback，不改schema、存档、资源与生成内容。
>
> ## 回归与反控
>
> - 新stepping10项：初次同步点击/尾门/空flow、分支共享、状态机、entry、计时真实文本/Unicode/上限、
>   暂停倍速、手动提前、替换停止、选项、移动及防连点。夹具经过当前正式守卫，原输入深快照。
> - 新UI1项：真实Playback+合法author scene，实际点击单步后left而非up，4按钮不变，
>   同一播放按钮恢复后up/done。另更新两文件原按钮文字与点击委派断言。
> - 新runner4项：命令调试门、取消不执行、等待中宿主modal重新关闭、异常身份；真实finally释放挂起链。
> - 定向editor12文件91项、reforge相邻3文件77项通过；旧D1隔离诊断由业务红转绿。
>   旧“单步代选”断言按用户新合同改为明确提交；旧换源断言先暂停新对话时钟，再验证旧移动零写回。
> - 原六针维护resume锚点，另五针移除步进钩子/首步请求、暂停时偷走对话、单步代选、使用文本ID
>   代替翻译文本计时。共11正控+11精确AssertionError业务红，正式源码hash不变。
>   复跑：`node docs/testing/archive/legacy/batches/codex-playback/mutants.mjs`。
>   最终日志`/tmp/codex-preview-controls-mutants-final.log`，原始JSON与逐针命中见
>   `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-playback-mutants-SpIQtV/summary.json`。
>
> 首轮新六项全部业务红，见`/tmp/codex-preview-controls-red.log`；后续夹具误用shared的id/label
> 被正式guard拒绝，改为现行name；UI测试SceneDef/AuthorSceneDef类型混用经合法明确构造纠正，
> 没有强转放行。另一个import排序诊断经Biome修正。最终门不接受任何静态诊断。
>
> ## 浏览器功能核验
>
> 6010正式s001页面独立标签，不修改作者内容、不保存、不操作用户原标签。
> 首次单步停在第1条（playMusic预览日志桩）；恢复后第3条第一句对话，未点击下一句即自行到第16条。
> 第23条暂停后跨越阅读上限仍文字完全相同，单步只到第24条且保持暂停。
> 截图`build/verification/preview-controls/paused-dialogue.png`为本地忽略证据。
> SHA-256：`2146d4927ace13ff83cf3eddfa4baf5373a70df43f25de629b839de09995d4a9`。
> 选择必须手动由生产控制器与DOM禁用断言覆盖，本次没有在真实PAL场景构造分支选项。
> 这不是001/002剧情/音轨或完整E2E验收。
>
> ## 统一门
>
> 完整check10,191项通过（editor3,299/reforge1,876），全部typecheck通过，
> lint2,392文件为0 error / 0 warning / 0 info。
>
> 官方ratchet与保护2f59be7f的单次严格fast9,730项/730文件串行通过；
> 全仓分支47,667/63,393=75.19%，本轮产品新增分母32、覆盖分子30（非纯补测收益），
> editor/reforge之外五包完整基线对象不变。Codex已核定done。日志
> `/tmp/codex-preview-controls-{check,ratchet,strict}.log`。
>
<!-- original-source-quote:end -->
