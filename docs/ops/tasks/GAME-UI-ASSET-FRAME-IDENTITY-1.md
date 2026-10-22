# GAME-UI-ASSET-FRAME-IDENTITY-1 — UI 单帧加载失败后的编号漂移

Status: review
Phase: phase1
Capability: assets / UI frame identity
Coding Owner: Codex（用户2026-10-22批准，三文件窄build allowed）
Generation Owner: N/A
Reviewer: Codex（自身核证，不冒充第三方）
Visual Verification Owner: Codex
Visual Verification Timing: 真实 loadAll→drawNumber/drawBox 像素与错误合同；浏览器未跑
Contributor: Codex
Branch: codex/code-quality-3y
Template: task-card-v1 / 1.0.0

## 目标

单个 UI PNG 返回404后，旧loadAll压紧数组而呈现按原SPRITEUI编号取帧，导致后面的图片画成当前数字或边框。现按用户批准保留原编号和缺帧位置；呈现缺帧处理、资源格式与其它资源策略保持。

## 范围

白名单仅loader.ts、load-all-recover.grok-r1.test.ts与load-all-ui-frame-identity.test.ts，保留原编号、迁移旧错误oracle及两例真实像素合同；其它optional资源的keyed Map、生成物、shared RLE真值、公共接口、存档与94–102均不变。先正式失败反例，再实现。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 资源合同 | UiSpriteManifest.frames[].index 指定帧号；呈现 drawNumber 固定 yellow base19，再加 digit。 | loader.ts 的 manifest/UI 装配、draw-number.ts 的 FRAME_BASE 与 drawNumber；是本项目资源与消费合同，不冒称完整 SDLPal 执行 |
| 当前实现 | 失败帧转 undefined，随后 push 成功帧，索引被压紧。 | loader.ts；既有 G01-C10 正在断言这一局部打包结果，不能当作显示正确证据 |
| 实际反证 | 71 个有效6×8 PNG，每帧独立色号；全成功时数字1用帧20色号20，帧19单独404后实际用帧21色号21。 | [3h当前证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/README.md)：正常1绿、反例1个像素业务 AssertionError |
| 边界 | 只控制 fetch 返回，真实 gzip/RLE/PNG 解码、loadAll、drawNumber、Framebuffer 写入；未运行浏览器或依赖下载竞态。 | 完整临时测试源、双 reporter、完整 stdout/stderr 与执行元数据 |

### 反证与替代解释

错误是编号漂移，不是把下载失败本身当缺陷，也不是已证原盘图片内容损坏。合成 PNG 用合法 manifest/帧尺寸，不替换解码核心；固定色号便于独立观察选帧。若将来 UI 消费改为显式原编号 Map，当前数组漂移结论须重新核。

## 上下文锚点

[父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、[工程质量规范](../code-quality.md)、[原3h卡](../archive/tasks/done/CODE-QUALITY-3h-game-assets-shell.md)。用户当前要求复审资产加载和测试质量，不自动批准新资产失败策略。

## 验收条件

1. 用户裁决是否保留原帧号，缺帧沿用既有呈现行为：drawBox 缺必要帧报错、drawNumber 缺数字帧跳过。
2. 获准后正式失败像素例先红，再最小修复；成功时帧号/顺序、原HTTP告警、其它资源 Map 与类型接口不变。
3. 将旧C10“压紧数组”断言迁移为正确编号合同，保留物品图标缺失/成功键合同；不得保留错误断言锁死缺陷。
4. A–H、定向/相邻及必要TC，相关卡集中全仓/official/protected；未过门不合main。

## 当前模式推进记录

2026-10-22 Codex单Owner，同一3y，测试质量提交da00c610a已推送；本卡先正式旧1绿/2业务AssertionError，再只修UI装配。三正式像素/错误合同、C10/C11迁移和资产相邻216绿，game TC0；[当前逐文件A–H与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/ui-fix.json)。六真实GOP快照均实际passed、输入只读SHA已核，解除旧六skip观察缺口，不由此认证shared全部格式。全仓/official/protected集中本模块窗口，完成前3h仍partial。

## 用户验收

用户2026-10-22明确批准“批准保留原编号（推荐）”。缺失位置不挪补，不新增占位图片或重试；缺必要边框报错、缺数字跳过沿用既有呈现合同。

## 交接日志

- 2026-10-22：2例真实宿主，1绿/1指定像素 AssertionError（expected20/received21），无超时/collection失败；全部端口恢复。不是正式产品测试通过，也不算新增closed。

## 下一位 Agent 提示词

默认Codex单Agent继续。用户已批保留原编号，无需再次请求；先完成本冻结模块集中门，未过门不合main。不重做已有效八维/反控，不扩94–102。
