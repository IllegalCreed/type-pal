# E2E-R4-1 — 路线驱动与合法检查点薄基线

Status: build
Owner: Codex
Phase: ops
Visual Verification Timing: e2e-consolidated（001独立执行器首批）

## 用户意图与当前准入

2026-09-27用户要求“回到E2E，推进001”。Codex核定首批build allowed，不再请求已定剧情边界：
先完成一阶段001从正常新游戏到房间可控的独立Playwright脚本、正式快存导出与新浏览器上下文读回。
二阶段对话观测仍缺cue/page状态，单列后续适配，不以盲发确认键或手造世界补齐。
本批不改游戏产品代码、存档格式、场景内容/迁移，也不接速胜；不把采样位置日志冒充完整已提交移动事件。
完整NPC静止区间诊断、二阶段001、002及后续仍未完成，本母卡保持build。

实施白名单：根package.json/pnpm-lock.yaml（独立Playwright工具依赖/命令）、scripts/e2e/**、
本卡/看板/测试索引/001执行文档及碎片目录状态。临时浏览器存储与产物仅build/e2e/，用户6010和存档不动。

| 前提 | 原版/primary | 第一阶段 | 第二阶段 | 本批目标 |
|---|---|---|---|---|
| 001正常新局 | 用户已定碎片；原始提取scene/0=L_4、scene/1=L_3545 | bootstrap:1765起新游戏handler先3.mp4再startNewGameFromPrimary | s000→s001/onEnter，dialogue仅暴露active | 正常菜单输入，不用skip-intro/dev-scene |
| 对话正常确认 | 原始脚本与用户“不跳对话”裁决 | dialogBox.phase及event-system等待门、正常KeyboardInputSource | DialogBox cue/page仍为内部状态 | 一阶段状态驱动确认、尾停顿等待；不改cursor |
| 结束档真实来源 | N/A，不改变游戏数据格式 | F5正式quick-save；tools/save-io.ts与Save API | 已有__tpE2e.dumpSave，后续使用 | 只导出本次实跑存档，正式parse/import+菜单读取回验 |
| 诊断证据边界 | 用户要求实际提交位移、有界日志 | 本批仅只读现有DEV状态与dialogHistory | 提交前motion trace不能证明静止 | 仅声明流程/检查点小样，不冒充完整时序或跨引擎验收 |

最强反例：跳过开场/旧槽恢复/新页读档失败落新局也显示场景。脚本须证明3.mp4完整结束、梦境/房间剧情锚、
菜单控制权、全新上下文起档与导出hash；恢复后比较实际世界摘要，不能仅以页面出现通过。

2026-09-27用户要求不再由Codex持续补覆盖率，转向讨论快速通关E2E，避免模型盲探剧情与迷宫。
GLM/Cursor仍后台补测，用户不承担手动通关。固定三签暂休。
最终执行器必须无Agent/模型API依赖：AI只在开发期设计/校准，运行时所有分支由程序决定，
未知状态失败留证；独立进程可连续跑声明流程是最终验收门，不以AI操作浏览器通关替代。
用户已追加确认两阶段双线、主线优先+大型支线、普通遇敌速胜/剧情Boss个案、保留对话和后续录制用途。
下述为准备期记录，已由上方001首批准入更新：范围不再重复请示；核两引擎实际观察/输入/保存/战斗结果入口、实施白名单与隔离方式，
再据[路线方案](../../testing/e2e-route-proposal.md)开执行器建设。不会因旧审计或check通过就宣称前置清零。
二阶段R4→N6b版本顺序保持，第一阶段独立向前，不等待二阶段卡住的片段。

## 一手锚点与真值

- 当前版本content20/SAVE8，`content/src/character.ts:168-170`；切版checkpoint重建，禁止兼容层。
- Reforge main:5372-5418的导出/恢复，main:797-809/5073后的读观察点；package.json没有runner。
- 碰撞与地图实例：reforge/src/collision.ts；动态移动继续走生产输入链，不用测试路径规划替换它。
- 用户已确认001/002见[剧情边界](../../../projects/pal/e2e-checkpoints/README.md)，003–010仍须Codex先起草。
- [现行E2E合同](../../testing/e2e.md)、[旧前置盘点](../../testing/pre-e2e-admission.md)和READ-FIRST：
  旧日期/行号/缺陷状态必须按当前树重核；一阶段只作内容/UX参考，不对齐内部状态。
- 最强替代解释：直跳场景或读档失败回落新游戏造成假通；必须有正式恢复成功与起始契约、真实前驱档hash。
- 第一阶段bootstrap:1120-1133/1918-1919的DEV状态与core/save/api.ts；game与reforge对话分页接口不同，
  不能共享内部存档或照搬固定回车次数。主线checkpoint只继承本引擎前段实跑结束状态。

## 准备期边界（历史）

不实现runner/测试后门/速胜，不改存档/迁移，不跑剧情或共享coverage，不替用户决定特殊战斗胜负。
Codex帧动画补测WIP冻结保留、未计入基线；+5pp目标未完成但不阻塞本卡讨论。
后续build卡须明确允许动作、只读状态协议、失败停线/预算、检查点来源链和小样验证。

2026-09-27追加诊断约束：重要NPC按实际位移变化记录，与对话/控制权事件共用时间线；
跨引擎按剧情节点/静止区间/事件偏序比较，不做每帧全世界dump或内部状态硬对拍。
现行Reforge trace在提交前，只作计划诊断；正式断言须看实际提交，溢出/漏事件不得静默放行。
李大娘站定说话→说完继续移动作为代表性回归；不复活Reforge全局对话冻结NPC。

## 2026-09-27 首批执行交接

[001执行说明](../../testing/e2e-001.md)：正常新局、3.mp4自然结束、梦境/叫醒全对话、房间可控，
F5导出真实档→第二隔离上下文正式导入/菜单读回/菜单控制验证。有窗口实跑exit0，36个正常按键，
131条状态变化，约76秒；无浏览器错误。保存/恢复持久域hash均为
`92bd6265f5c532be8e9bc7bac55b3494f7b54fea1cf0983d92f4e991fb4855aa`。
结束与读回截图已目视：房间/人物可见、淡入结束、无剧情对话残留。
产物`build/e2e/game-001-2026-09-27T01-32-07-387Z/`；checkpoint
`a34f8d900a49b2bbe63a63034b20a91aaf702a8d4b7fb6e29692896fa96e7fa5`。

校准记录：首次误用scene编号验证dialogHistory.map而失败；第二次流程/读回绿但截图处于自动淡入初始窗，
故补needToFadeIn观察与回归，第三次有窗口实跑闭合。未修改产品/资产/旧测试/覆盖基线；
安装Playwright时包管理器顺带升级spessasynth_core已撤回并frozen重装，音频依赖保持生产原值。
执行器7项合同测试通过；不以此小样宣布完整001/Q1/Q2通过。

统一质量门：隔离提交树`9d45ef11`执行`env -u NODE_COMPILE_CACHE pnpm check` exit0，
七包9741/9741、全包TC零诊断、严格lint扫描2247文件为0error/0warning/0info；
docs/coverage-tools/quality-tools/e2e-tools全部通过，日志`/tmp/codex-e2e-001-check.log`。
其后相同执行器散列经`pnpm e2e:001 --headless`独立复跑exit0：131事件/36按键/约76秒，
结束/读回持久域hash与有窗口跑相同；新档hash为
`5805d87f8c3dfb03ef5afc6a94c27b73e1052020832136c44b782e8c0c11a599`，
产物`build/e2e/game-001-2026-09-27T01-39-32-894Z/`。不同实跑档含运行时瞬态，
不要求跨次全文件hash相等；每次均钉本次F5字节与实际恢复持久域。
Codex核首批流程/检查点小样accept，可集成；packages/与coverage实现/基线零diff，
本轮不重复ratchet/strict-fast、不宣称官方覆盖增长。主树未提交帧编辑测试/临时探针保持原样，
质量门针对隔离的提交树，不把这些未完成WIP计入结果。

无下一位Agent提示词；Codex继续Reforge只读对话适配/实际NPC提交事件，母卡保持build。
