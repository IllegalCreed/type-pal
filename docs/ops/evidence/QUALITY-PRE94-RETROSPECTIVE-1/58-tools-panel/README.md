# CODE58 tools-panel 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE58 tools-panel 当前复审切片」的主题按原文时点保留(摘录:> 2026-10-18 当前更正：头注仍把小地图写成96，bootstrap实际传640；battleSig只拼选定字段，不能当完整实时checksum。源事实注释已修并保持AS)。

## 范围与证据

原报告含章节[CODE58 tools-panel 当前复审切片、读取与事实边界、测试与结论、2026-10-18 夹具/隔离结论勘误]、3个链接;固定main源3364B(SHA 5510f886dc67)。当前存活入口:[README.md](../53-wave-gates/README.md) [README.md](../58-tools-panel-fixtures/README.md) [README.md](../core-comment-audit/tools-thumbnail-hotkeys/README.md)。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3364B / SHA-256 5510f886dc67cbb45c82abaab6ca5420590ff880369f7c985b30251dfa8be96a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE58 tools-panel 当前复审切片

> 2026-10-18 当前更正：头注仍把小地图写成96，bootstrap实际传640；battleSig只拼选定字段，不能当完整实时checksum。源事实注释已修并保持AST/JS相同，旧源关闭转review；已有58测试宿主修复保留原范围，不新授save/完整UI信用。详见[当前有限返工](../core-comment-audit/tools-thumbnail-hotkeys/README.md)。旧原件保留，历史门不恢复。

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`e03c191d6`；分支：`codex/code-quality-3y`。本片重新核验历史 CODE-QUALITY-58 的生产工具面板；不改变 DOM 形态、公共接口、存档 schema 或 save-io 版本边界（后者由 CODE-QUALITY-59 独立拥有）。当前卡复审为 `partial`。

## 读取与事实边界

完整读取 `packages/game/src/tools/tools-panel.ts`、`tools-panel.test.ts`、`tools-panel.glm-phase1-leaves.test.ts`；读取 bootstrap `setupToolsPanel` caller、`minimap.ts` controller、`save-io.ts`、`quick-save.ts`、`battle-inspect.ts` 与当前依赖控制器。面板属于 type-pal 新增工具 UI，SDLPal 无对应 primary；phase1 约束是只读投影与显式委托，不改变战斗/移动/存档语义。

核验范围：根节点/样式幂等、六个 tab、Backquote 冒泡与游戏输入隔离、战斗签名 250ms 刷新、场景/minimap rAF 委托、音量/静音/音乐源/缩放/FPS/fullscreen 委托、对话搜索、计时器设置、导入导出调用和 quick-save 的边界提示。save-io 的 FORMAT/VERSION/必要字段合同只作 caller 边界，未在本片扩张。

## 测试与结论

- `tools-panel.test.ts` + `tools-panel.glm-phase1-leaves.test.ts`：2 files / 18 tests passed。
- 覆盖 setup 幂等、开关/关闭、焦点在面板内仍可用 Backquote、tab 切换、场景/对话 DOM、战斗状态签名刷新、音频三路/主静音/音乐失败重试、计时器、缩放/FPS/fullscreen 委托。
- 未发现重复、恒真或无业务执行用例；测试只验证真实注入依赖和 DOM oracle，不把 save-io 的版本检查偷并到本片。
- `pnpm --filter @type-pal/game typecheck`：passed。波次级全仓质量门沿用 [`53-wave-gates`](../53-wave-gates/README.md)，本片不重复运行昂贵 coverage。

未关闭：save/import version 与 payload 合同继续由 CODE-QUALITY-59 处理；tools panel 没有独立 disposer，生产 bootstrap 只安装一次且 setup 有根节点幂等门，本片不扩张生命周期 API。58 当前 `partial`，不是整卡 `accept/done`。

## 2026-10-18 夹具/隔离结论勘误

本页18绿和“测试只验证真实注入依赖”的陈述不足以认证主测试合法性或隔离：后续发现核心`as never`伪造不完整状态、body/timer清理遗漏window监听器。上述两项精确由[58夹具勘误](../58-tools-panel-fixtures/README.md)替代，旧raw和当时结论保留。新片已改正式构造器/hydrate与共用宿主；跨例旧单红新绿、正式19例和相邻199例通过。新片无全仓/coverage/protected门，不能用本页53波次认证新候选；整卡仍partial。
```
<!-- incremental-original-source:end -->
