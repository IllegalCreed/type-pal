# EDITOR-AUTO-LOCATOR-1 — 精灵引用跳转到实际自动方案

Status: done
Phase: phase2
Owner: Codex Root
Coding Owner: pre005_editor_edges
Reviewer: Codex Root
Visual Verification Timing: dev-functional
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是精灵库引用行“编辑自动脚本”跳转缺陷的窄修历史记录：点击后到了正确实体却选中“交互脚本”并显示尚未创建；下述验证均为原卡时点陈述，本次文档治理未重跑。

## 目标

点击“编辑自动脚本”后打开正确场景/实体/auto 通道及实际初始页绑定的自动方案；非第一初始页/非第一个 auto 方案仍定位正确，引用过期或绑定被删时可见拒绝，不跳到另一方案；不改作者数据。

## 范围

- 范围内：仅 App.tsx 与 App.reference-navigation.test.tsx；候选 45598749c（Root 接为 fcada709a）复用既有 canonicalOwner/Page focus 与失效拒绝能力。锚点：WorldSpriteLibrary:1272 调用 onJumpAutomaticScriptInstance；App:585-587 只把旧 `${entityId}:auto` 写入 drawer.src，当前 CanonicalSceneScriptWorkspace:79 默认 trigger、:100-148 只消费 focusOwner/focusReference，App:2732-2760 不传 drawer.src；world-sprite-behavior:480-487 按帧序投影取 initialPage 绑定的 auto 方案。
- 范围外：兼容 drawer.src 旧语法、schema/运行时/脚本正文/公共引用格式；其它定位、未保存内容与 history 行为（保持）。

## 前提与证据

Root 在 6014 隔离合法工程实际点击复现；最强替代解释“加载异步尚未完成”已由资产完成后仍见 aria-selected=false 排除。这是现行功能可达性缺陷，不是测试输入限制。新增测试先红后绿；单一 Owner 隔离提交，自验不替代 Root 验收。
- 当前状态：done（历史终态）

## 验收

原卡记录：Root 直接审读候选——点击时读当前两个 session、按实际 initialPage 与 auto 绑定再核精灵身份，不复活旧语法、不改数据/history；贡献者 5 项先红后绿；Root 独立 App 导航/真实工作台 48 项绿且 stderr 空、editor 两段 typecheck 无诊断；同一测试裸 focus 的 tooltip act 警告用一行 await act 消除，未屏蔽 console 或改产品 tooltip；真实 6014 从精灵引用行点击，自动行为 aria-selected=true、deep-empty 的 deep 方案与实际共享调用正文可见，截图 build/pre005/auto-locator-final.png，保存/撤销保持 disabled；主 6012 未操作；全仓基线 10989 测试/七包 types/2758 文件静态零诊断已过，最终共享门归母卡。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡无用户转交提示词：内部贡献者交付后由 Root 接收。S14 本页治理只改写泛化封套。

## 历史范围

2026-10-02 前后 005 前清账窗口（[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)），Root premise verified/design agree/build allowed 后实施。2026-10-17 R42 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：跳转按实际 initialPage 绑定的 auto 方案定位，经 Root 独立实测接收。原卡全文在下方 quote 保全。

## 当时证据

源码锚点 WorldSpriteLibrary:1272、App:585-587/:2732-2760、CanonicalSceneScriptWorkspace:79/:100-148、world-sprite-behavior:480-487；候选 45598749c/Root 接收 fcada709a；截图 build/pre005/auto-locator-final.png。本页治理未新增任何执行。

## 当前有效性

historical。定位行为与 act 警告处理为修复时点结论；当前编辑器导航以现行测试与代码为准，不因本页重授。

## 继任文档

同窗边角修见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)、[EDITOR-SCENE-FACING-1](EDITOR-SCENE-FACING-1-clear-override.md)、[EDITOR-MAP-SELECTION-NOTICE-1](EDITOR-MAP-SELECTION-NOTICE-1.md)。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `beef77f095aa8e2507bba2cc827d9d34f3b0b508d34b647df847d08ff2fae182`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # EDITOR-AUTO-LOCATOR-1 — 精灵引用跳转到实际自动方案
>
> Status: done
> Phase: phase2
> Owner: Codex Root
> Coding Owner: pre005_editor_edges
> Reviewer: Codex Root
> Visual Verification Timing: dev-functional
>
> ## 实际缺陷与准入
>
> 本卡归[005前清账](PRE-005-DEBT-1-current-edge-closeout.md)。Root在6014隔离合法工程实际点击
> 精灵库引用行“编辑自动脚本”，虽然到了正确实体，却选中“交互脚本”，显示尚未创建；不是自动行为。
> 刷新后依旧，用户6012未动。这是现行功能可达性缺陷，不是17层测试输入才有的运行时限制。
>
> 原版/一阶段N/A：全新编辑器导航。当前一手链：WorldSpriteLibrary:1272调用
> onJumpAutomaticScriptInstance；App:585–587只把旧`${entityId}:auto`写入drawer.src；
> 当前CanonicalSceneScriptWorkspace:79默认trigger、:100–148只消费focusOwner/focusReference，
> App:2732–2760并不将drawer.src传入。故旧入口信息未进入当前工作台。
> 帧序投影world-sprite-behavior:480–487明确取initialPage（缺席时第一page）绑定的auto方案，
> 导航必须按同一已存在canonical绑定定位，不能任意取第一方案。
>
> 目标：点击“编辑自动脚本”后打开正确场景/实体/auto通道及实际初始页绑定的方案；不改作者数据。
> 最强替代解释是加载异步尚未完成，Root在资产完成后仍见aria-selected=false，已排除。
> 反控：非第一初始页/非第一个auto方案仍定位正确；引用过期或绑定被删时可见拒绝，不跳到另一方案。
>
> Root premise verified / design agree / build allowed。只允许改App.tsx与App.reference-navigation.test.tsx，
> 复用现行canonical定位/失效拒绝能力，不加兼容drawer语法、不改schema/运行时/脚本正文/公共引用格式。
> 现有其它定位、未保存内容与history保持，新增测试先红后绿；Root再用实际精灵库入口核auto选中。
>
> 单一Owner隔离提交，自验不替代Root验收。无用户转交提示词，内部贡献者交付后由Root接收。
>
> ## Root独立接收
>
> 候选`45598749c`（Root接为`fcada709a`）直接审读：点击时读当前两个session，按实际initialPage与auto绑定，
> 再核当前精灵身份；复用既有canonicalOwner/Page focus，不复活drawer.src旧语法、不改数据/history。
> 贡献者5项先红后绿，Root独立App导航/真实工作台48项绿且stderr空、editor两段typecheck无诊断。
> 同一测试裸focus导致的tooltip act警告用一行await act消除，未屏蔽console或改产品tooltip。
> Root在真实6014合成工程从精灵引用行点击，自动行为aria-selected=true、deep-empty的deep方案及实际共享调用正文可见；
> 截图`build/pre005/auto-locator-final.png`，保存/撤销保持disabled。不是只看mock callback。
> 主6012未操作；本轮全仓基线10989测试/七包types/2758文件静态零诊断已过，追加导航按以上独立验证，最终共享门归母卡。
<!-- original-source-quote:end -->
