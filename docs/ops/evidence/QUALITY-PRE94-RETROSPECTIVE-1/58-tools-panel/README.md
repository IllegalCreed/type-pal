# CODE58 tools-panel 当前复审切片

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
