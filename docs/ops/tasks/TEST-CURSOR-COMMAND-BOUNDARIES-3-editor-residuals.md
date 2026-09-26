# TEST-CURSOR-COMMAND-BOUNDARIES-3 — 八组编辑命令行为残项

Status: build
Owner: Cursor
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯命令数据合同；不声明UI观感通过）
Production Base: `7cac1d72ac0b8a44521a353cc87dbe1d18d65fa5`
Branch: `codex/cursor-command-boundaries-r3`

## 准入与边界

2026-09-26用户要求继续给Cursor分派，并让Codex并行补覆盖。Codex已读现行命令入口与
官方fast LCOV，核 **premise verified / build allowed**。此前F2搬移已done，本批只补真实行为缺口，
不是重做出口同一性测试。主线产品零改，当前canonical模型不扩政策；不等其它AI签字。

一手真值是下表八文件的公开Command构造/apply/invert及现行guard、既有业务测试；原版/一阶段N/A，
不测玩法。最强替代解释为“缺口是不可达防御臂或已被旧用例证明”，必须先核而不是硬造内部状态。
[冻结机账](../../testing/coverage-parallel-wave3-evidence.json)的cursor组给出hash/逐行逐臂，仅是缺口候选，
**212个零命中臂不是承诺新增212臂，更不是要求100%**。共享支路只记一次。

## 八组连续工作

目标均在`packages/editor/src/core/`，每组新增测试名为`<模块>.residual.test.ts`。

| 组 | 模块 | 初始缺口B/L | 优先行为 |
|---|---|---:|---|
| C1 | actor-commands | 35/13 | patch引用合法性；移除/恢复与顺序；名称、资源、援护者缺失单轴拒绝 |
| C2 | entity-commands | 33/24 | 实体新增/移动/修改/移除的apply→invert→redo；构造参数防别名；无对象的现行no-op |
| C3 | tileset-commands | 37/5 | 共享/新建资产所有权、撤销仅删除本人资源、proof冲突；不伪造正式成功proof |
| C4 | sprite-commands | 35/11 | 布局/姿势帧需求、真实引用拒删、共享blob保留与恢复 |
| C5 | battle-sprite-commands | 36/12 | 记录冲突/路径占用/帧数，敌人切换和撤销；合法二进制与metadata一致 |
| C6 | map-asset-commands | 24/2 | 独立地图创建/复制/绑定/删除，恢复manifest与索引、引用保护与无输入污染 |
| C7 | startup-commands | 10/1 | 入口合法性与默认入口、资源角色清除/恢复、实际startWorld验证；不改启动政策 |
| C8 | asset-label-command | 2/0 | 缺目标/清空标签/恢复原标签与稳定id/path；已有证明可直接登记，不为凑组造测试 |

每组先读旧同名/commands.test/edit-session以及刚接收的Cursor identity/order测试，列精确旧title与
本次差异。真实公开入口，合法fixture从buildBlankProject→正式loader→toEditorState建立；资源按
现有正式encoder/合法最小二进制构造，先过现行guard。拒绝由合法输入仅破一轴，精确message/错误身份，
输入在调用前深快照、调用后比实际同一对象；成功至少钉目标结果、旁对象/顺序、完整undo/redo结果。
不反射私有字段、不mock核心、不写平行实现、不用as unknown as构造合法态；未apply的invert若只属防御合同如实分类。

## 白名单与交付

- 最多八份上述新`.residual.test.ts`；可新增`src/core/__tests__/cursor-command-boundary-fixtures.ts`。
- 专属证据`docs/testing/cursor-command-boundaries-r3/**`：README、receipt、evidence、4–6针代表单点负控工具。
  可以按组连续提交，但整包交付；预计数十项，不保底/不追数量，已有证明可减少文件/用例。
- 不动产品、旧测试、全局配置、官方baseline、其它任务卡/看板/共享README；本卡只追加本人交付块。
  目录链接已预注册。发现现行产品缺陷：单列最小红诊断，由Codex决定修复，不把错误改成绿预期。
- 判据复用已验收`cursor-commands-wave2-audit.mjs`/原runner经验：目标绝对file+实际fullName、唯一
  load命中、恰exit1、候选AssertionError、拒混错/timeout；有干净正控、源hash不变。不另造复杂判据框架。
- 定向/相邻/全editor、TC、改动Biome、docs/diff各整批一次；`env -u NODE_COMPILE_CACHE`。
  不跑全仓check/ratchet/strict，不启动浏览器，不操作6010。开发期不逐组跑coverage；如需证实增量，
  仅整包一次官方testSelection同口径/tmp前后对照，输出不能落共享coverage目录。
- 逐组记录新增、已有、无法通过公开路径到达及其证据；实际测试名/数量从最终JSON产生，别凭记忆写。
  提交推送真实SHA。作者自验不代替Codex验收；不合main、不标done。

并行所有权：GLM只动content三守卫叶；本对话Codex只动content五资源/引用模块的新测试；另一Codex
负责A3/B1等架构产品。Cursor不改这些文件，也不碰App/MapMode/ScriptEditor架构。

## 下一位Cursor提示词

```text
接手TEST-CURSOR-COMMAND-BOUNDARIES-3，先读AGENTS/CLAUDE/READ-FIRST、本卡与冻结机账cursor组。
从含本卡的origin/main在独立worktree/分支codex/cursor-command-boundaries-r3开工，不checkout主工作树。
按C1–C8连续补真实公开命令行为，先去重，不重做F2搬移/出口身份。遵守本卡八测试+可选fixture+专属证据白名单。
合法工程走正式seed/loader，正负同型单轴、实际输入深快照、完整apply/undo/redo，4–6代表负控。
不要改产品/旧测试/配置/基线，不追缺口全清或用例数。全包完成后统一定向/相邻/editor/TC/Biome/docs，
不跑全仓质量门或逐组覆盖。提交推送最终SHA和真实回执；Codex独立验收后合并收口，不等三席签字。
```
