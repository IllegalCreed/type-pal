# GAME-AVI-RETRY-OWNERSHIP-1 — 视频再次播放失败后的重试入口

Status: done
Owner: Codex
Phase: phase1
Capability: shell / AVI error recovery
Coding Owner: Codex（唯一写入Owner）
Generation Owner: N/A
Reviewer: Codex（实际源码与原件，不冒充第三方）
Visual Verification Owner: Codex
Visual Verification Timing: 正式失败反例与修复后DOM/media-IO模拟；未声称实体设备验收
Contributor: Codex
Branch: codex/code-quality-3y
Template: task-card-v1 / 1.0.0

## 目标

核清并裁定视频自动播放失败、第一次点击重试也失败后，仍可见的“点击屏幕开始”提示是否继续接受点击。

## 范围

仅playAvi重试提示的监听ownership及对应测试。键盘/抽象跳过消费、500ms缓冲、视频源、音量、自动播放策略、Save、资源管线及二阶段均不改变。

## 前提真值门

当前avi-player完整读取。tryPlay首次拒绝创建overlay并注册once click；点击触发第二次play，但拒绝后因clickOverlay已有值直接return，没有恢复已消费的监听。提示仍显示，后续点击不再发起play。这段tryPlay不是移动端新增算法；本轮增量复核发现既有缺口。

只读隔离副本中，真实playAvi/DOM运行，仅媒体play端口返回合法Promise结果。单次拒绝→重试成功对照1绿；两次拒绝→再点击、第三次原可成功的场景恰1条业务AssertionError：提示仍存在，非超时或收集错误。警告消息/参数/次数精确捕获，finally发ended并释放实际监听；未运行实体设备权限序列。

## Draft: 设计与风险

用户2026-10-22批准“修复重复重试”：保留可见提示，每次重试失败后恢复点击入口，成功或视频结束后清理；未完成的重试不并发重复发起。先将正式失败反例落入现有测试，再改实现。

## 上下文锚点

[父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、[当前证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/mobile-revalidation/README.md)、[原件索引](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/mobile-revalidation/avi-repeat.json)。原CODE78与移动端任务提供单次拒绝/skip生命周期证据；不能推出连续拒绝恢复已通过。

## 验收条件

用户裁决后先冻结真实失败反例，再窄修并核定向/相邻。须同时保留单次拒绝正常恢复、未决重试防重复、结束时清理与旧skip合同；不靠增加等待时间通过。当前CODE78/AVI实现撤回review，其余两个未改测试只保留原已证合同。

## 当前模式推进记录

build allowed：Codex唯一Owner，同一3y，仅上述重试监听ownership与测试。用户批准已收到，无需再次申请；实现accept/done仍须红绿和相邻验证。其它pre94卡按各自窗口推进。

## Build: 实现与自测

正式两条新增合同在未修实现先红：重试成功后仍残留可见提示的DOM AssertionError、结束后旧节点仍调用媒体端口的ownership AssertionError。窄修为稳定回调：once消费一次手势，拒绝后重新注册，成功/结束显式解除。最终5例suite对冻结旧源仍3绿2红，修后8文件61例通过且stderr0；当前统一全门未跑。首6例草案与初跑两条不存在路径过滤参数的4文件41绿原件均保留，不伪称实际跑6文件；迟到用例与既有M1/M2排重后不加入最终suite。

## Review: 审查与返工

这是重试监听生命周期缺口；不是新移动代码必然导致，也不宣称已在真实手机权限下复现。当前source SHA见机器原件。CODE78仍维持partial至本次逐文件证据与集中全门完成；61定向不是统一门通过。

## 用户验收

2026-10-22用户回复“批准修复重复重试（推荐）”。此授权不扩大到播放策略、跳过时序、资源或其它产品行为。

## 交接日志

- 2026-10-22 Codex：移动端影响核对中复现上述UI失败。保留当前代码，开卡并撤回相关当前接受信用，等待用户取舍；其它批次继续。
- 2026-10-22 Codex：收到用户批准，进入build。先保留正式失败原件，再窄修；当前CODE78/AVI仍为partial/review，批准本身不恢复接受信用。

## 下一位Agent提示词

无下一位Agent提示词，Codex单Agent维护。先核用户裁决、当前源SHA及原生失败身份，不扩大产品范围。

## 2026-10-22 Codex收口

用户授权内两正式红例先行，窄修与61相邻/全check20432/official fast及同报告strict/protected零诊断成立，CODE78与AVI实现恢复接受。旧once失效/旧节点监听反例永久保留；当前只读源与原件快检见[统一回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/game-actions-mobile/README.md)。done不表示实体手机权限/编解码/完整剧情或用户真机体验已验收。提交推送合并状态按实际Git记录。
