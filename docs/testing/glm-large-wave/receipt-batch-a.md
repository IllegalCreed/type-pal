# TEST-GLM-LARGE-WAVE-4 · A 批回执（编辑器命令表单与作者工作区）

- 候选 SHA（r1 本批完整提交）：`1429e1b1b845821bc2b30eeea5bb449610ec2289`；
  R2 返工完整候选：`031b3e479e18bf1add1d5b559716172cfb7c031f`；R3 窄返工候选：本次推送提交（完整 SHA 见推送输出与最终回执）。
- 逐条 file/fullName/status：[batch-a-directed.json](batch-a-directed.json)（新鲜 Vitest JSON，47/47 passed）
- 新增文件：12 个源文件各一个同目录 `.glm-large-wave.test.ts(x)` + 白名单 fixture
  `packages/editor/src/__tests__/glm-large-wave/command-form-glw-kit.ts` + 隔离宿主
  `docs/testing/glm-large-wave/browser-host/` + 共用反控判据 `needle-judge.mjs`。
- 门禁：editor `tsc --noEmit` 0 诊断；13 个新增文件 Biome error/warning/info 全零；
  `node scripts/docs/check.mjs` PASS；`git diff --check` 干净。

## 每组旧证 → 新差异

| 组 | 源文件 | 旧证（去重依据） | 新合同（本批新增） |
|---|---|---|---|
| A01 | command-form-control.tsx | current-data 证 setFlag/setVar/addVar/openShop/giveMoney/giveItem/loseItem；current-movement 证 cameraPan；coverage-batch 证 branch 条件臂 | playSound 选择/缺失警告/空目录态 + `onOpenSound` 委派（8 测试中 3 条）；playMusic 提交资产 id；setAmbience 有/无氛围表两路；learnSkill 数字槽位+警告；clearDialog 无参合同 |
| A01 | command-form-world.tsx | current-scene 证 loadScene 弹窗 16 例；current-movement 证 wait/fade/hold/reveal/dither/teleportParty/setPartyFacing/moveParty/nudgeParty；current-identity 证 setActorSprite/setActorAppearance | `makeLoadScene` 三模式字段形状（pos 深拷贝、可选键不携带）与 `retargetLoadScene` 重置+朝向/过渡保全（6 测试，全部过 `checkCommands` 合法性） |
| A02 | command-form-dialogue.tsx | current-dialog 证身份切换/称谓覆盖/位置光标/自动推进/加行取消；characterization 证 actor 立绘选项清单 | unbound 从目录首张 portrait 资产启用立绘并提交资产 id；side 翻转保资产；取消清除整组 portrait；actor 立绘启用→主立绘↔命名表情切换（3 测试） |
| A02 | command-form-actor.tsx | actor-workflow-coverage 证 apply/clear 类型切换；characterization 证状态词表与清除语义；coverage-workflows-2 证 setParty 加人 | 不可参战/不存在目标的显式禁用项；持续回合 1–999 双向钳制；毒抗加值下限钳制；setParty 按行替换保持站位顺序（5 测试） |
| A03 | DataMode.tsx | glm-ui-wave 证 scripts 空态/events/敌人试打/战斗域深链；item-alchemy 证双炼化页 | scripts 页带真实 ScriptEditSession 挂载目录+工作区；sprite 域切换回调的定义优先/asset 回退与 onObjectFocus 兜底；shop 页 isProjectDirty 对主会话+脚本会话脏态的合成（4 测试） |
| A03 | SharedScriptTab.tsx | SharedScriptTab.test 证搜索/创建流/元数据提交/删除 live 复核/空态 | focusScriptId 深链选中且深链在位时选择被钉回（新发现行为）；self 契约切换落库；重复稳定 ID 创建经 createError+onError 双路；引用未就绪删除关闭；引用面板逐行「打开」回调（5 测试） |
| A04 | SceneScriptWorkspace.tsx | SceneScriptWorkspace.test 证选择跟随/预览范围/页签可见性/引用与 owner 深链 | 传送出口槽位切换回显已有变体；实体自动行为通道切换的空态提示（经 preview 探针 hint）（2 测试） |
| A04 | AmbienceTab.tsx | AmbienceTab.test 证创建/删除/引用门/字段提交/Escape 恢复/live oracle | 当前乘色色板随草稿即时回显、Escape 回 canonical、blur 提交后保持；切换目录行色板跟随；preview 包把实时 tint 与 projectKey 传给 AmbienceScenePreview（3 测试） |
| A05 | StampLibraryTab.tsx | StampLibraryTab.test 证搜索/检查器/改名复制删除/扫描失败/会话复用/锚点/组合画布/笔刷/接管 16 项 | focusObjectId 深链决定初始选中并随 prop 跟随（1 测试，真实项目+AddStampTemplateCommand） |
| A05 | SpriteUploadWizard.tsx | wizard.test 证多帧导入与入库锁；selection 测试证在途换选/草稿竞态/同内容去重 | 动作帧行 K 参与 4+K 整除推导：切帧读数与缩略图数量变化、整除失败显式报错并撤下缩略图、回退恢复（2 测试，真实 sliceAtlasGrid） |
| A06 | EnemyAnimPreview.tsx | EnemyAnimPreview.test 证 noop 重同步/有效编辑一次提交/undo-redo | 定义缺失与资产记录缺失的可见失败；无施法帧/0 tick 提示；在途换定义旧加载不得以旧帧数覆盖（4 测试） |
| A06 | FireEffectPreview.tsx | preview-cache-boundaries 证帧缓存/SHA 调色板失效/在途换选/失败恢复 | 播放/暂停与倍速、figcaption 实速标注；音效准备失败错误可见且不进入播放；闸门未释放保持加载态、释放后真实解码挂载（4 测试） |

## 登记为不可达/未证（未建测试）

- `ControlCommandForm` 的 jumpScript/callScript/setEntityAuto/setEntityTrigger/setSceneOnEnter/
  setSceneOnTeleport 臂：这些 kind 被 `checkAuthorCommands` 拒绝（非 current 作者命令），且
  `CommandForm` 唯一生产调用方 CanonicalCommandForm 从不传 `scriptIndex`/`onOpenScript`——
  「可复用脚本」标签与打开按钮臂无消费者。回执登记，不强行造运行时方言输入。
- `WorldCommandForm`/`ActorCommandForm` 的 moveEntity/setEntityState/setEntityFacing/
  setEntityFrame/playEntityAction/stopEntityAction/stepEntity/animEntity/nudgeEntity/
  takeEntity/releaseEntity/mountParty/ride 臂：均属 `AUTHOR_CUSTOM_COMMAND_KINDS`，canonical
  作者路径走 ScriptEditor 内联表单，经这两个 family 组件不可达（已被 coverage-workflows-2 等
  以内联形式证到）。
- `DialogueCommandForm` 运行时方言 cue（无 identity）的说话人/立绘臂：AuthorDialogueCue 恒带
  identity，运行时 cue 无当前生产入口。
- EnemyAnimPreview 共享引用确认门（referenceCount>1 的 window.confirm 文案）：需要构造合法的
  battle-sprite 引用边集合，本批未证，留给 Codex 复核或后续组。

## 业务反控（共用 judge：needle-judge.mjs，3 枚全 VALID）

| 针 | fullName | 结果 |
|---|---|---|
| playSound 提交资产断言改错 | playSound picks a catalog sound and forwards onOpenSound with the stable asset id | 恰 exit1、AssertionError、唯一失败、产品 hash 不变 |
| makeLoadScene pos 深拷贝断言改错 | makeLoadScene field preservation > pos mode deep-copies the temporary position so later mutation cannot leak in | 同上 |
| 在途换定义帧数断言改错 | A06 敌人动画预览 > 在途换定义时旧加载完成不得以旧帧数覆盖新选 | 同上 |

judge 自证：对照原文件 exit0（1 条真实执行）、注入点恰 1 次、临时副本跑完即删、
`packages/*/src` 生产源 SHA256 前后一致。

## 隔离功能视觉（端口 6086，/tmp/type-pal-glm-large-wave/）

宿主：[browser-host/](browser-host/)（vite 严格端口 6086，react/@type-pal 别名指真实包源码）。
证据 JSON：[browser-host/evidence-browser-a.json](browser-host/evidence-browser-a.json)；console 错误 0。

| 条 | 截图 | SHA256 | 视口 | 步骤→预期→实际 |
|---|---|---|---|---|
| A1 命令表单清除/取消 | A1-command-form-editing-1440x900.png | 034658cd1b54f5c65d9ab849f689894994308cd95b377b608bca582a582f6aa2 | 1440×900 | 打开「修改变量」，把设为 2→5 → 弹层显示草稿 5 → 与预期一致（截图可见） |
| | A1-command-form-after-cancel-1000x720.png | cccb314123f8aa1772e4e9f9e8d3267ebdfb3cb3d04bffed7eb317b119d97835 | 1000×720 | 点取消重开 → 输入恢复 2、已保存值不变 → 实测 valueAfterReopen='2'，true |
| A2 音效缺失恢复 | A2-sound-picker-missing-1440x900.png | 1daaa87134b4034f5c84c495dc2a89df26a8bd5737eb320da414cebe0b1f26c8 | 1440×900 | 初始值 sound-ghost 不在目录 → 显示 ⚠（缺失或类型错误）→ 实测 missingShowsWarning=true |
| | A2-sound-picker-recovered-1000x720.png | 9fc9817b57b4d47344f34e2e7f274945940f7b23f02a10a92ee426319eefe821 | 1000×720 | 选「鼓点 (sound-drum)」→ 警告消失、值恢复 → 实测 recoveredClean=true |

URL `http://127.0.0.1:6086/`；直挂范围声明：只挂 CommandForm（草稿取消）与 SoundPicker，
不冒充完整 App；未点音效试听（避免宿主无音频设备的假失败）。

## 未证项汇总

- 上述「不可达/未证」清单 4 条。
- B/C/D/E 批待做；Codex 独立验收、全仓质量门与覆盖率门未运行（本批不运行全仓 check/ratchet/strict-fast/E2E）。

> R2（返工，候选 `031b3e479e18bf1add1d5b559716172cfb7c031f`）：`command-form-world` 测试改名 `.tsx`（与源扩展名一致）；11 枚代表针已按
> R2 严格判据（needle-judge R2 + selftest 反例套件）重跑，全部 VALID；本批新增测试已清零
> 全部 `as never`/`as unknown as` 强转，DataMode 改为全真实挂载（无组件替身）。
> R3（窄返工）：A1–A3 针改用完整失败名精确相等重跑 VALID；判据 INVALID/异常路径先清理临时针。
