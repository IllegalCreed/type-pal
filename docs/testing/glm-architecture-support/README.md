# GLM 架构治理并行支持包 r1

任务：[ARCH-SUPPORT-GLM-1](../../ops/tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md)。
生产冻结 **b11d4bc9**；Codex正独立实施A3帧循环，GLM不改其代码/测试/任务卡。
用户2026-09-25确认GLM有视觉能力并要求多分任务；本包允许实际视觉取证，最终由Codex复核。

## 开工与文件边界

- 必读根AGENTS/CLAUDE、phase2 READ-FIRST、任务卡、架构队列、现行设计规范，不能只读这份摘要。
- 独立分支 `codex/glm-architecture-support-r1`，独立worktree建议 `/Users/zhangxu/illegal/type-pal-glm-architecture`。
  从**包含本工作包的main提交**建分支，不从主目录checkout；记录真实起点SHA。
  冻结目标生产文件须与b11d4bc9相同；若main已前进且目标漂移，先定位最后满足冻结的工作包提交，不覆盖/回退主树。
- 唯一写入白名单：`docs/testing/glm-architecture-support/**`（md/json/mjs）。
  不改packages/scripts/配置/正式测试/基线/共享看板/他席卡，不制造默认红测试，不运行官方check/ratchet/strict。
- 本目录可增8份报告、一个机账`evidence.json`、必要的只读探针；README自行登记实际存在文件。
  截图/录屏放专用本地临时证据目录，不把大批调试图片/原版资产提交Git。机账登记绝对路径、SHA256、viewport与步骤。
- 不修改真实用户项目/存档。视觉使用本包独立dev服务6013（editor）/6053（reforge）、一次性沙盒/内存测试数据；
  不重启6010/6051，不使用Codex正在操作的标签页，不清空用户localStorage/IndexedDB。
- 新worktree缺gitignored资源只记环境问题。安装用冻结lockfile；资源只做可验证的只读接入，禁止迁移写盘。
  若依赖链接解析回main，须先纠正/披露，不能把main执行当候选执行。记录Node/pnpm/浏览器/缩放/DPR。

## 八包，顺序连续完成

不设“必须找出多少bug”的额度指标。每包完成后独立提交；未获新授权不改生产代码，八包完成一次性交付Codex。
先做V1中的一个完整小样（真实页面操作→截图→可复现结论）确认视觉通路，再按P1～P6、V1～V2连续做。
小样若工具受限可先完成P1～P6，V项如实blocked，不假装截图通过。

| 包 | 目标/首要源码 | 必交付成果 | 不做什么 |
|---|---|---|---|
| P1 App所有权 | editor/ui/App.tsx（冻结5170行）及直接hooks/caller | state/ref/effect/listener/timer逐项谁建谁改谁清；导航/保存/历史/试玩边界图；最小可拆单元与真实回归标题对账 | 不重写App，不以行数直接判bug |
| P2 地图工作区 | editor/ui/MapMode.tsx（3819行）及命令/手势helper | pointer/键盘/选择/剪贴板/拖拽生命周期；取消/提交/undo同步区；数据/DOM边界；每个拟拆单元的保真断言 | 不改碰撞、坐标、地图格式或手势习惯 |
| P3 脚本表单 | ScriptEditor.tsx（4361行）/CommandForm.tsx（2098行）/SceneScriptWorkspace | 按命令族列表单/校验/引用/可用性/存储层；共享逻辑重复与不能合并的语义差异；default/hook/session清理/undo现有测试精确标题 | 不复活旧script模型/兼容fallback，不把warn说成error |
| P4 战斗会话 | reforge/battle/battle-session.ts（3022行）及直接阶段helper | 阶段转换/输入选择/动作与呈现/两级资源屏障/终态结算的读写、取消、Promise所有权图；拆分先后与不可跨await区；对应已通过真实会话用例去重表 | 不碰main/新BattleHost/A3，不改公式，不重跑剧情 |
| P5 第一阶段环与主控 | game/core/event-system、scene-system、equip-effect、battle-opcodes、menu-driver、menu-mode、magic-script、shell/bootstrap | 真正runtime边与type-only边分开；7文件环逐边真实caller；可先切断的无行为变化边及资源收尾；已确认缺陷必须有参考/原数据/真实调用证据 | 不把二阶段身份模型强加给一阶段，不凭SCC推导bug |
| P6 迁移/校验边界 | migrate-content/mapScenesStatic、translate-events/walkBody、content/author-script-core↔enemy-script | 转换阶段与磁盘写入责任图；校验递归的真实调用域；纯函数候选/共享底层协议建议；精确输出/错误路径/幂等回归对账 | 不跑--write、不改generated/schema/事务格式、不发明新校验政策 |
| V1 表单视觉/交互 | BattleSimulatorWorkbench/Forms/TrialDialog、ActorMode、物品/技能/敌队/战场编辑 | 按现行规范检查列宽、按钮长度、间距、滚动、选择器/多选、键盘/Esc/焦点回归、取消保真；分别记录正常与异常证据 | 不随意改UI形态，不把内容缺失说成布局缺陷，不保存真实工程 |
| V2 工作区视觉/交互 | App导航/侧栏、场景/MapMode/ScriptEditor/SceneScriptWorkspace | 多栏收缩、侧栏滚动与详情区、弹窗遮挡/焦点、缩放下可达性、切页取消/返回定位；现行支持宽度的可执行复验矩阵 | 不因360旧披露边界提出“必须支持”的新政策，不把小屏截图当完整E2E |

## 统一取证纪律

1. 每条机账唯一ID（P1-001等），字段至少：包/冻结SHA/源码file:line与hash/操作或命令/实际结果/预期来源/
   分类/证据路径/受影响域/现有测试确切文件+完整标题/建议归属。小计机械计算，不能手填后不对账。
2. 分类只用`covered/reproduced/risk/blocked/N/A`。静态读出只可证明依赖/结构；动态缺陷要实际失败和同输入正控。
   不能用grep命中标题证明分支已覆盖；需要时运行小型定向/只读探针，脚本默认只写自己的临时目录。
3. fixture先过现行正式guard；错误注入精确到目标边界、有entered见证、失败前后业务状态/IO深快照。
   不允许固定sleep等到红、不吞异常后宣称成功、不把ENOENT/TypeError/timeout当业务反证。
4. 对已有测试：说明它“确实证明什么”和“本次差异是什么”。历史探针不改；新探针冻结旧锚点与当前锚点分列。
5. 视觉先读`docs/phase2/specs/editor-design-system.md`、相关已done UI卡、
   `docs/testing/battle-simulator-implementation.md`、`item-authoring-implementation.md`、`editor-functional-visual-2026-09-22.md`。
   建议先1440/1024；768仅在规范支持范围内判定，360只记录既有边界。区分CSS px/设备像素、页面缩放与截图缩放。
6. 视觉缺陷要给“进入路径→对象→操作→实际/预期→可重复截图”；正常邻近场景作对照。空白、截断、颜色问题先排加载失败/资源解码/浏览器缩放。
   标明实际用哪个浏览器工具，看到了什么；只执行JS/读源码而没看图，必须标非视觉证据。
7. 不做完整PAL剧情E2E，不变更产品裁决，不降低覆盖门槛，不扩大白名单。
8. 交付前按提交树重算：diff白名单、产品hash、报告/机账计数、探针命令退出码与实际红因、Biome。
   最终给总报告：本包确证事项、未证风险、建议可拆实施批次、最小正式回归集合与复核入口；不标done、不代签、不转Kimi。

## 交付清单

- 八份报告建议命名`p1-app.md`～`p6-conversion-validation.md`、`v1-forms.md`、`v2-workspaces.md`。
- `evidence.json`含全部条目、机械小计、所有实际命令/exit、截图清单与校验值；可复算命令写进本README。
- 若有probe，列完整命令与解释；默认只读取证，无真实项目写入、无官方覆盖率重算。
- 每包一提交；最终push同一工作分支，报告起点/最终SHA与白名单，统一交Codex接收。
- GLM是证据/测试贡献者，不能把自己的交付自验算成独立审查。

## 实际交付登记（GLM，2026-09-25）

- 分支 `codex/glm-architecture-support-r1` @ worktree `/Users/zhangxu/illegal/type-pal-glm-architecture`；
  起点 `3270473862…`，每包一提交，最终 SHA=push tip。冻结漂移核验：`git diff b11d4bc9..32704738 -- packages/ scripts/` 空。
- 实际文件：`v0-visual-sample.md`（视觉小样）、`p1-app.md`、`p2-mapmode.md`、`p3-script-forms.md`、
  `p4-battle-session.md`、`p5-phase1-core.md`、`p6-conversion-validation.md`、`v1-forms.md`、
  `v2-workspaces.md`、`summary.md`（总报告）、`evidence.json`（32 条机账+机械小计+命令+截图清单）。
  probes/ 目录本轮未产出脚本（全部判定用既有测试标题对账+浏览器实际操作，无需新探针）。
- 截图 11 张在 `/tmp/glm-arch-visual/`（不入 Git），SHA256 前 16 位与 viewport 见 evidence.json.screenshots。
- 视觉工具：ZCode In-app Browser，实际看图；dev 6013 包内实例；工程磁盘经 `git status` 核验零改动。
- 复算命令见 `summary.md` 尾节。
