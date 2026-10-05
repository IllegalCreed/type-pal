# ARCH-REGRESSION-LAB-GLM-1 r10 独立接收

2026-09-26；候选 `cafac8dc`，分支 `codex/glm-architecture-regression-lab-r2`，起点 `f5f166aa`。**整批 counter；G01 平移取消轴 accept，V01 人物名称阻断已由 Codex 实测排除。** 主线任务保持 `build`（首批 37 项已经正式接入），不回退为候选卡的旧 `draft`。本轮未合候选、未改产品/正式测试/官方基线。

## 独立复跑

- 候选工作树干净；`f5f166aa..cafac8dc` 恰为实验目录与本卡；产品/scripts 无改动。
- 新鲜 `/tmp/codex-glm-r10-candidates.json` **41/41**；verify **51 条 48/1/2 PASS**；五针 red-control 均为候选业务 AssertionError、exit1、注入见证命中；tsc、目录 Biome、docs、diff check 均 exit0。Biome 有一个 `g01-pan-cancel-needle.mjs:26` 未使用变量 warning，非阻断。
- 这些机械结果不验证回执文字、七入口去重或浏览器阻断归因。完整本席记录见[机账](architecture-regression-lab-codex-r10-evidence.json)。

## 已闭合的浏览器证据

G01-07 **accept**。GLM 原截图 SHA256 确为 `a2d51f7d3ef1b526cbc0a22a6a86a54011516e49c76242e13332ec513846e1d8`；画面为等距格网与一个小瓦片。本席以同一生产 `MapMode` 在自有 6013/6014 宿主独立重放：1440×900、DPR1、canvas956×793；本席实际缩放29%，不冒称复现 GLM38% 的逐像素绝对值。生产源码零写盘，反控仅移除 `cancelPointerInteraction` 的 `panRef.current=null`。

- 两宿主完整合成 down→move→move→up 均从 `d23580b4…` 变为 `a52c8e4b…`，证明输入确实平移。
- 同输入 down→move→cancel 后均为 `8c9c2753…`；接着 CUA 真实指针移动（日志 `isTrusted=true`，move 先于 click 的 down/up），干净宿主保持该 hash，反控宿主变为 `9cc00358…`。同一输入下，取消门有可鉴别性。
- 本席临时 UI 驱动只通过正常 DOM PointerEvent 进入真实 React 监听器，测试期 setPointerCapture 替身用后恢复；未读/写私有 React 状态。复跑脚本 `/tmp/codex-r10-g01-host.mjs`、`/tmp/codex-r10-g01-client.js`；截图已在本次浏览器工具结果中目视。临时标签、端口和 viewport override 已清理。

V01 人物名称这一窄轴由 Codex 补验：隔离 PAL 开发快照、正常 `getByRole('textbox',{name:'人物显示名称'}).fill(...)` 后 Enter，标题与列表即时变为新名称，撤销由 disabled 变为“撤销：修改文本”，点击撤销恢复“李逍遥”；fill 后点标题失焦同样提交，Escape 取消草稿也恢复旧名称。`ActorMode.tsx`/`controls.tsx` 与候选冻结逐字相同。**V01-04 的 blocked-automation 不能继续作为当前阻断**；GLM 当次根因未知可保留为历史失败记录，并引用本席成功证据。其余表单与 V02/V03/V04 仍未做。

## R10-1：G06 去重矩阵未落，且遗漏真实 author→enemy 边界

任务卡声称“入口×证据矩阵已入 receipt”，实际 receipt 没有该矩阵，G06 行仍写7项/三入口。原工作包所指七个递归调用是 `author-script-core.ts` 的 `branch.then:661`、`branch.else:663`、`loop.body:669`、`startBattle.onLose:708`、`startBattle.onFlee:710`、`teleportOut.onFail:722`、`confirm.onNo:726`；另有跨模块边 `startBattle.choreography:712`。交付列的 enemy AI 条件 all/any/not、effect、onDefeated 测试不能代替这些调用点的逐项映射。G06-08/09/10 的新增合法组合/回调透传可作为窄证据保留，不据此宣称原矩阵完成。

本席沿缺失边发现**真实结构校验缺陷**：`:712` 调 `checkBattleChoreography` 时漏传 `options`，而 `author-script.ts:106-120` 通过该选项提供 `checkAuthorDialogueCue`。直接 `checkAuthorCommands([{kind:'dialog',cue:{rows:[{text:'probe'}]}}],...)` 拒绝缺 identity；把同一 cue 放进 `startBattle.choreography` 却接受。两路补合法 `{identity:{kind:'narration'}}` 均接受。候选生产树与当前 main 相关源码相同。

返工：按上述七入口及跨模块边列真实测试标题/锚点/已证与未证；将此缺陷留下显式失败诊断交 Codex 产品修复，不能改预期放行或让 GLM顺手改生产代码。现有三条新增用例无需推倒重做。

## R10-2：G08-07 恢复正控没有证明脚本恢复

`g08-conversion-isolation.test.ts:163-186` 的缺布局异常确在转换中段，接受这一定位。但“修复后同脚本成功/无残留”只检查 `scenes.length=1`、`entities.length>0`，没有检查修复后的 `setActorSprite` 命令及其稳定资源身份，也没有与一次新鲜正确输入的完整输出比较。

独立隔离单点反控：保留 `translate-events.ts:1624` 的 `spriteIdForNum` 解析/异常，把 `:1625` 的 `push({kind:'setActorSprite',actor,sprite})` 改为空块。`CODEX_R10_DROP_SPRITE_HIT` 命中，G08-07 仍 **1 passed/0 failed、exit0**；即使成功路径把原脚本动作吞掉，本例仍绿。配置 `/tmp/codex-r10-g08-drop-sprite.config.mts`、结果 `/tmp/codex-r10-g08-drop-sprite.json`。

返工：验证实际输出的 actor/sprite 命令和 SpriteDef 身份，补修复输入的前后深快照及“先失败再正确”与独立正确运行的输出对照；上述丢命令反控必须在候选断言上业务红。options 分类须给精确旧测试标题和调用层，不能以 `translate-events.test + *.pal.test` 的泛指结清 `mapScenesStatic` 调用域。

## R10-3：交付口径与剩余工作

receipt 顶部 r10 说明下面仍登记旧 r1 分支/worktree、45条37项，机械小计和复跑注释也是旧数字；复制其 `cd /Users/zhangxu/illegal/type-pal` 命令会跑 main 的37项而非候选41项。README仍标 r9；results顶层分支/worktree还是 r1。须改成真实候选位置、51条/41项及逐组数，保留历史信息时明确标历史。G01补齐可复制的干净/反控宿主和手势步骤、坐标/像素算法（现回执只有反控启动概述），可以引用本席补验，不重拍旧图。

V02/V03/V04“本轮预算内未执行”应继续列**未完成**，不能转为环境阻断或完成；`projects/e2e-own` 旧 map v2 不要求改旧生成工程，本工作包已授权用 `buildBlankProject`/正式编码器建立自有当前版本fixture。V01其余五类表单继续补齐。

下一位 GLM 提示词已同步任务卡。Kimi 本队列豁免；本轮不标 done、不合候选、不更新覆盖率。
