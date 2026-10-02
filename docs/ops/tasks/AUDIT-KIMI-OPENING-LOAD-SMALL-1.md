# AUDIT-KIMI-OPENING-LOAD-SMALL-1 — 单一读档错误边界短审

Status: build
Owner: Kimi（只写独占审查报告）
Reviewer: Codex（独立接收）
Phase: ops
Capability: ops / premise-audit
Visual Verification Timing: N/A（本卡不操作浏览器）

## 目标与额度约束

用户2026-10-02报告Kimi/Grok均约剩1/3额度，只安排一轮小任务：
为[标题读档IO缺陷](REFORGE-OPENING-LOAD-ERROR-1.md)提供错误承接/资源归属的短审，
最多两页报告、最多两种建议方案。**不实现、不跑全包/覆盖率、不自动续派**。
不是恢复三贤人强制签字，也不是产品build准入或UI取舍授权。

## 固定输入与隔离

- Source base：`849255a49ca795dae9259c3f12a44a2714e39e53`（当前main已核真实对象）。
- 该源基点为content21/SAVE10；母卡2026-10-01红诊断是当时content20/SAVE8的历史合法输入，
  不直接复制旧fixture冒称当前存档。错误入口/Store的Promise拒绝本次源码仍可核；可完全不复跑。
- 工作树：`/Users/zhangxu/.codex/worktrees/kimi-opening-load-audit-small/type-pal`。
- 分支：`codex/kimi-opening-load-audit-small-r1`，由Codex从上述源基点预建。
- 任务卡/既有证据在审核树`/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal`读取，
  不复制进自己的分支，不写母卡/其他Owner。
- 唯一提交白名单：`docs/testing/kimi-opening-load-small-report.md`。
  不需要安装依赖。若只读取代码足以裁决，不运行任何复现。

主要源码限四个：`reforge/src/opening-menu.ts`、`main.ts`相关片段、
`save/store.ts`、`save/browser-state.ts`。按需最多补读四个直接相关测试/既有证据，不整仓扫描。
`main.ts`只读SaveStore构造、标题菜单调用、顶层错误承接片段，不通读整个main。

## Codex前提核验

本子卡只增加文档证据，不改变用户行为；母卡保持draft，保存/schema/Store接口、
错误显示方案、重试策略均未准入。
当前main相对旧审核树只在opening-menu cleanup新增退场黑底；未增加enterLoad catch。
固定源`opening-menu.ts:122-130`await listMeta/getThumb/createImageBitmap，`:147`仍void enterLoad。
`save/store.ts:116-139`真实req.onerror可reject；`main.ts:471,508-525`有实际Store/菜单caller。
既有合法current payload/PNG + getThumb边界拒绝的独立红诊断见母卡及
[Q r2机器证据](../../testing/glm-tenfold-triple/codex-q-r2-review-20261001.json)。
最强反证：当前真实入口已有catch/Promise桥或Store永不reject；本次直接源码未见，但要求Kimi独立核。
一次新的失败不能反推save/schema损坏，不能恢复旧开发存档兼容。

## 六个短审检查点

1. 三个await的拒绝分别由谁承接，外层Promise是否能感知。
2. 不改变菜单布局/保存接口的最小承接位置，最多两个备选、说明取舍。
3. 连续Enter/迟到结果与菜单已退出时的所有权。
4. rAF/keydown/已解码ImageBitmap的释放与错误路径收尾。
5. 需先红后绿的最小三条IO回归方向（只设计，不扩测试矩阵）。
6. 哪个具体UI决定仍需用户/Codex准入；不要自作错误文案、重试界面或保存兼容策略。

可选额外复现**最多一例**，且只在自有mkdtemp合成current输入、真实公开入口/typed IO reject；
如确需复现，按固定849255的公开current构造器/类型生成，不恢复旧格式兼容，也不因版本差异扩查schema。
不得真实存档、PAL、浏览器/服务、世界后门、业务核心mock或非法PNG。
优先复用已证明合法红诊断，未复跑明确标记。探针不提交，只把确需的新事实摘要写报告。

## 交付与验收

报告放testing根目录，不创建证据子目录/README，不要求修改共享导航。报告≤两页等价篇幅，包含：`premise verified/counter`直接file:line、最强反例、
≤两方案、三条回归方向、未定产品问题、已跑/未跑；不要只复述Codex摘要。
仅报告commit/push，交完整40位SHA；不改任务状态、不accept/done母卡、不清树。
本地可只跑`node scripts/docs/check.mjs`和`git diff --check`，不跑统一重门。
Codex独立核报告并决定母卡后续；本卡交付即停，保留余量。

## 当前模式推进

- Codex：前提与单一证据Owner已核，**build allowed仅独占报告**，2026-10-02。
- Kimi：pending；实现文件/配置/旧测/官方baseline/数据/共享文档/GLM/Grok/Cursor树全部只读。
- Codex报告accept：pending；母卡产品build与用户体验选择仍未开放。

## 下一位Kimi提示词

```text
接手AUDIT-KIMI-OPENING-LOAD-SMALL-1，当前build仅短审报告，你是唯一报告Owner。只一轮：≤两页报告、≤两方案，不全包/覆盖率/浏览器，不自动下一任务。工作树/Users/zhangxu/.codex/worktrees/kimi-opening-load-audit-small/type-pal，分支codex/kimi-opening-load-audit-small-r1，源基点849255a49ca795dae9259c3f12a44a2714e39e53。先从审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal读docs/ops/tasks/AUDIT-KIMI-OPENING-LOAD-SMALL-1.md、母卡REFORGE-OPENING-LOAD-ERROR-1.md及其中合法IO红诊断，再独立读opening-menu/store/browser-state和main相关片段。核listMeta/getThumb/decode拒绝的Promise承接、重复/迟到/退出、rAF/键盘/bitmap归属；给最小承接层≤两备选、三条回归方向及仍需产品选择。当前main仍void enterLoad，别把旧source行号或摘要当独立证据；最多补读四个直接测试/证据，可选仅一条自有合成公开入口诊断，已成立红证据优先复用，不重复走剧情。仅docs/testing/kimi-opening-load-small-report.md可提交，放testing根不创建新子目录/README；其它全部只读，不安装依赖、不修产品/旧测/配置/save/schema/真实数据或共享卡。报告给premise verified/counter+file:line/反证/实际已跑未跑，commit/push完整SHA后停止。不得母卡build/done、合main、官方门或清树。
```
