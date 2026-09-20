# EDITOR-SKILL-TRIAL-1 - 共享战斗模拟器首批与独立试打

Status: done
Phase: phase2
Capability: D-04/D-05修复及共享战斗模拟器首批；不启动第三阶段X5
Coding Owner: Codex
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/editor-battle-simulator-r2

Revision: r2a / 2026-09-20人数勘误；用户明确我方本来就只有1～3人，不扩展4～5人。保存/隔离/四目录约定不变，人数三席已齐并经Codex核定随r2主体恢复已批准范围的build。生产冻结`e58834f6389a40ffe9f187e6a8051f552e964d79`；r1和r2人数旧签保留历史。
用户此前裁决仍保留：**独立临时试玩，不读写正常存档，关闭试放即丢弃测试状态**。
本卡与[GLM六组补测](../../../tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)独立；后者只改新的非视觉测试，Codex只改本卡产品面。
此前已核r2三席设计准入并开始首批实现；2026-09-20发现我方人数前提不完整，用户已澄清原需求是1～3人。本轮核定r2a三席补核完成，不再等待人数选择或重签；r1不实施。

## 完成收口（Codex，2026-09-20）

**done allowed → done。** 用户明确回复「UI 验收通过，可以收口」；Codex核定主体fe0fee84与最终列宽补丁
d394eccc三席accept齐、无counter，当前产品树相对d394eccc零漂移。用户最终验收与全部审查门均满足，
按终态规则归档任务卡并同步看板/索引；不代签、不借收口重开其它测试包或扩展新入口。

按用户本轮指定候选核定：**fe0fee84三席审查条件已满足**，Codex在`9b4ee229`落卡、GLM在`7734e94a`、
Kimi在`ce54967c`均明确对同一候选accept，无当前counter；cb44c378机制accept按历史范围保留，不替代增量签。
主体审查不重开，用户最终UI验收亦已确认；本次只查签字/既有证据和最终diff，没有重跑产品技术测试。

**最终核定：主体与列宽补丁的三席审查门均已通过，用户最终UI验收亦已通过。**
列宽补丁`d394eccc`：Codex自验已落`24bc106c`、Kimi `bae06842`与GLM `e40aaff3`均对同候选accept，
无counter/返工项；HEAD的packages/scripts相对它零diff，两份新签提交仅改本人审查记录。
这不是把fe0fee84签字外推；补丁已获得独立增量确认。不再追加Agent审查、不重跑已核技术测试。
Status为done，用户裁决依据为本轮明确回复；本次只更新收口文档/路径，不改产品或覆盖率基线，不倒填新测试记录。

### 用户最终UI验收（已明确通过；清单留档）

用户已确认本节范围通过并授权收口。以下为已交付的验收清单；不把用户确认倒填成新的Agent测试运行。

入口：编辑器顶栏 **战斗模拟器 → 试打方案 → 本场临时方案**。若已有临时配置直接使用，不要覆盖；空配置可添加
一个已有可参战角色（PAL工程可选李逍遥）。以下界面已由Codex实测，用户只需判断产品效果：

1. 点「添加队员」搜索一个未在队里的角色，选择后取消：人数不变；再次选择并确认：只加1人。
   已满3人时添加禁用属于预期，不必删现有队员凑流程。
2. 看同一队员的「脚部/习得技能」及敌方「编队来源/敌方槽位」：各自组内左右边缘齐。
   将窗口缩窄到约900px：自动换行、不裁切；将编队来源切换引用/临时、技能模式切换继承/指定，列宽不跳变。
3. 在「指定技能」里勾选/取消一项：外部已选数量同步变化，关闭后表单不变成长串按钮。

该清单无需重新执行。保存事务、存档隔离、战斗公式/战斗全过程沿用已接受证据，不让用户替Agent跑命令。
用户UI通过与列宽增量审查是两个门，本轮均已满足并由Codex统一收口。

披露边界保持：原生目录选择器保存→重开正向浏览器链未完成（真实writer/loader/事务集成已过）；360宽沿现有主壳限制；
full/Q1/Q2未执行，不能写成全量E2E完成。两席此前对这些边界的非阻断判断仍按原范围保留。

无下一位Agent提示词，本卡已收口。下方历史提示词和旧阶段状态不再授权执行。

### 历史：列宽4文件增量提示词（两席已完成，不再发送）

**Kimi：**

```text
在 /Users/zhangxu/illegal/type-pal 增量确认 EDITOR-SKILL-TRIAL-1 的列宽补丁d394eccc，对比fe0fee84；卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md，review。
先同步main检查工作树，读AGENTS/CLAUDE/READ-FIRST、卡面done准入核定/当前列宽补丁及docs/testing/battle-simulator-implementation.md列宽节。fe0fee84主体三席齐，不重签设计、不重开机制。
仅核Forms className、业务CSS、既有UI断言和CSS普查快照这4文件：统一auto-fill、显式收缩约束、移除独立限宽，没有改变业务回调/公共控件/引擎。Codex定向22项、TC/Biome/build及四尺寸实际视觉通过；不重复视觉，不跑全仓或改基线。选择器/360/full-Q1-Q2边界保持。
独立读取源码，不读取或复述GLM补丁结论；只在本卡列宽补丁的Kimi席位及本人日志签accept或带file:line反证counter，提交推送，保留其它席原文。不得改实现/状态，不代签用户，不标done。
```

**GLM：**

```text
在 /Users/zhangxu/illegal/type-pal 增量确认 EDITOR-SKILL-TRIAL-1 的列宽补丁d394eccc，对比fe0fee84；卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md，review。
先同步main检查工作树，读AGENTS/CLAUDE/READ-FIRST、卡面done准入核定/当前列宽补丁及docs/testing/battle-simulator-implementation.md列宽节。fe0fee84主体三席齐，不重签设计、不重开机制。
核4文件白名单、既有UI测试仅加断言、CSS快照只有auto-fit→auto-fill，未改测试数/选择/基线；按需复跑editor的battle-simulator-ui、field-layout-adoption、number-field-adoption共22项。Codex的四尺寸像素测量归视觉证据，你不操作浏览器、不判断截图，不补跑全仓覆盖率。选择器/360/full-Q1-Q2边界保持。
独立读取源码，不读取或复述Kimi补丁结论；只在本卡列宽补丁的GLM席位及本人日志签accept或直接反证counter，提交推送，保留其它席原文。不得改实现/状态，不代签用户，不标done。
```

## 当前列宽补丁（2026-09-20，候选d394eccc）

用户继续指出「脚部/习得技能」「编队来源/敌方槽位」宽度不齐。本次统一扫描整个模拟器下拉表单，
不是单独调两处像素：删独立短宽度/HP-MP限宽，公共业务网格用auto-fill保持空轨道，显式可收缩宽度防内层裁切。
候选**d394eccc**，增量对比**fe0fee84**；产品只改Forms的className与业务CSS、补既有UI用例断言和一行CSS普查快照。
无模型/业务回调/引擎/公共控件修改，不重签r2/r2a设计。下方两席对fe0fee84的新签均原文保留，不代签本补丁。

- Codex：**accept（2026-09-20，自验）**。定向22/22、editor TC/Biome/build通过；四档真实浏览器测量同组22个下拉/多选，
  1920/1280/900/720宽均等宽，继承/指定与敌队引用/五槽切换后不跳宽，内部网格无横溢、控件无出屏。
  具体数值/初轮裁切发现与修正见[实施记录列宽补丁](../../../../testing/battle-simulator-implementation.md)。
  本补丁未重跑全仓check/覆盖率，也未修改基线；fe0fee84的7895/7404保持其原候选口径，不能倒填成新跑。
- Kimi：**accept（2026-09-20，列宽补丁 d394eccc 增量对比 fe0fee84；4 文件本人直读/主树复跑，未读 GLM 补丁结论）**。
  - **4 文件白名单属实**：产品仅 `BattleSimulatorForms.tsx` 5 处 className 调整（删 4 处
    trial-choice-short、1 处 trial-pool-columns，队伍位置改挂公共网格）+ `battle-simulator.css`
    （删两个私有类，`.trial-config-columns` auto-fit→auto-fill 并补 min-inline-size:0/inline-size:100%）
    + 既有 UI 用例新增断言 + CSS 普查快照单行值更新；无业务回调/公共控件/引擎/模型改动。
  - **语义核对**：auto-fill 保留空轨道，使单列行与相邻多列行同轨等宽（auto-fit 会折叠空轨道
    把唯一字段拉满）——对齐「脚部/习得技能」「编队来源/敌方槽位」的根因修正；子项仍 ≤24rem、
    容器 ≤72rem，间距全为 --ds-space-* 令牌，未私改公共控件默认尺寸。
  - **测试与普查**：既有用例新增 17 个下拉标签同属 `.trial-config-columns` 轨主的断言、两个
    删除类不再出现、动态「指定技能」同轨；CSS 普查快照仅 auto-fit→auto-fill 一行。
    baseline 未改（无新增测试文件/计数变化）。
  - **本席复跑**：battle-simulator-ui 10+field-layout-adoption+number-field-adoption 共 22/22 绿
    （含「locks every production CSS grid track」普查门）。TC/Biome/build 与四尺寸视觉采信 Codex
    已落证据，不重复视觉，未跑全仓/未改基线。选择器/360/full-Q1-Q2 边界维持。
  - 旧版本兼容审查 pass：纯 UI 轨道修正，无格式变化。返工项：无。
- GLM：**accept（2026-09-20，仅列宽增量 d394eccc 对比 fe0fee84；独立源码直读+主树复跑，未读 Kimi 补丁结论；未做视觉）**。
  - **4 文件白名单属实**：`git diff fe0fee84..d394eccc` 恰为 Forms.tsx/battle-simulator.css/
    battle-simulator-ui.test.tsx/field-layout-css-census.snapshot.txt（+36/−13），无其它路径；
    HEAD 的 packages/scripts 相对 d394eccc 零 diff。
  - **Forms 只改 className**：5 处 `trial-choice-short` 移除、队伍位置 div 改挂
    `trial-config-columns`、`trial-pool-columns` 修饰符移除——零业务回调/props/公共控件改动。
  - **CSS 与卡面一致**：删两个私有限宽类；`.trial-config-columns` `auto-fit`→`auto-fill`
    （单字段行保持等宽空轨道）并加 `min-inline-size:0; inline-size:100%` 显式收缩防内层裁切。
  - **测试仅加断言**：diff 零 `-` 行、零新 `test(`——既有用例内新增 17 个下拉 label 最近
    容器必须恰为 `trial-config-columns`（同轨道 owner）、删除类必须为 null、指定技能同容器；
    注释如实声明几何归浏览器。测试数/选择/基线不变（baseline 不在 4 文件内）。
  - **CSS 快照恰一行**：`.trial-config-columns` 的 `auto-fit`→`auto-fill`，无其它 selector。
  - **本席复跑 22/22**（battle-simulator-ui + field-layout-adoption + number-field-adoption）。
  - 四尺寸像素测量归 Codex 视觉证据；选择器/360/full-Q1-Q2 边界保持。无 counter。
- Codex准入核定：列宽补丁三席accept齐，无counter；与主体三签合并判断，技术审查门全部通过。用户最终UI验收已通过，随整卡done；无下一位Agent提示词。

交接日志（GLM，2026-09-20 列宽增量）：对 d394eccc 相对 fe0fee84 的 4 文件列宽补丁完成独立
确认并签 accept（证据见上）：白名单恰 4 文件、Forms 仅 className、CSS 删私有限宽并
auto-fill+收缩约束、测试仅加断言（零新 test/零删陧行）、快照单行 auto-fit→auto-fill、
基线不在补丁内；定向 22/22 本席复跑绿。未读 Kimi 补丁结论，未做视觉，未改实现/状态，不标 done。

## UI-r1主体接收（2026-09-20，候选fe0fee84；cb44c378不再收口）

用户指出添加队员应使用候选弹窗、短选项仍被拉满、有效技能与属性贴行，并要求完整UI/交互复核。
此前Codex撤回旧UI验收并按同卡rework处理；现返工候选为**fe0fee84**（增量对比**cb44c378**），重新进入review。
下方cb44c378的Kimi/GLM代码级accept原文保留，不代替本轮UI验收；其它席位不必重审未变化的引擎/保存机制。
r2/r2a保存、隔离、人数与四目录架构不变，不重签设计；本轮按既定设计系统和用户反馈修正采用方式。
返工起点证据（下列行号钉旧候选cb44c378）：`BattleSimulatorForms.tsx:108`将live角色追加做成InlineComposer，不符合DS-C.4e；
`:182`三项位置枚举占整行；`:319-343`readout内部无间距owner；`battle-simulator.css`的1fr分列仍拉宽短控件。
复核域：四目录和快捷试打弹窗，含队员/物品候选弹窗、确认前零修改/关闭归焦、短枚举/引用/长文本宽度、
有效值与技能分组间距、临时配置覆盖/取消语义。不改模型、存储、引擎和公共控件默认尺寸。
实现与证据详见[实施记录UI-r1节](../../../../testing/battle-simulator-implementation.md)：公共候选弹窗明确确认、短选项限宽、
自适应列、readout与快捷弹窗节奏、删行归焦，以及命名/快捷入口两条临时配置覆盖确认。

### done前（UI-r1，候选fe0fee84）

- Codex：**accept（实现者自验，2026-09-20）**。最终完整check7895项、官方ratchet与保护cb44c378的单次strict-fast7404项通过；
  两次ratchet及strict的最终计数完全相同，editor23,200/28,619行、20,006/28,326分支；不降门槛、不改排除。
  新增4条实际React/App工作流回归，原7条UI断言与技能注入/三人限制继续通过；公共picker新增2个采用登记，未改公共实现。
  本人实看1920/1280/900/720宽四目录与快捷弹窗，搜索键盘选中/取消归焦、命名添加/移除、长名、窄窗双列/回落均验证；
  技能读数间距实测12px、位置256px、移除82px，未见横向溢出。Reforge/content/编辑器core/play相对旧候选零diff。
  既有原生目录选择器、360宽主壳和full/Q1/Q2边界仍按实施记录披露；未把机制旧签复用为新UI验收。
- Kimi：**accept（2026-09-20，UI-r1 候选 fe0fee84 增量对比 cb44c378；全部锚点本人直读/主树复跑，结论形成于读他席新结论前）**。
  - **DsAddPickerDialog 合同（公共控件本轮零改，只增采用登记）**：`add-picker.tsx:116-126`
    revision/scopeKey/readOnly/可用性变化即关闭；`:128-140` 已选候选失效或被过滤即清选择；
    `:142-171` 确认是唯一变更路径，cycleRef 拒迟到异步结果；取消/Escape 只 resetDraft 零命令。
    Forms 接线：`BattleSimulatorForms.tsx` 队员/物品两处 `revision=useMemo({state,value})`——undo
    或外部变化改变 identity 即关弹窗；onConfirm 复核上限/候选存在，失败返 false 不变更；
    候选排除已配置项；删行先 focus sectionRef 再移除，picker fallbackFocusRef 回区域。
  - **临时配置两入口覆盖确认**：命名方案入口 `BattleSimulatorWorkbench.tsx:206-216`——已有 changed
    临时草稿且不在草稿视图时先入 replacement 确认，取消保留旧草稿、明确「放弃旧调整并替换」才
    onDraftChange；`replacementScope` 以 {state,draft,directory,objectId} identity 失效过期确认
    （:82-94、:709 双重比较）。快捷入口 `App.tsx:3557-3563`——trialDraft.changed 时走 setTrialLeave
    确认，否则直接进；确认文案改为「放弃本场临时配置？」。命名记录仍走
    SetBattleSimulatorLibraryCommand（可撤销），临时草稿隔离，二者互不染。
  - **未私改公共控件默认尺寸**：battle-simulator.css 全部为业务容器类——间距一律 --ds-space-* 令牌，
    短选项 16rem、引用/字段子项 ≤24rem、容器 auto-fit 起步 16rem 总宽 ≤72rem、元数据 56rem、
    readout 52rem、背包/行内入口 36rem；未改 design-system 组件 CSS 或控件默认值。采用登记
    add-picker 5→7 owner、6→16 数据路径为精确扩容，deferred 不变；CSS census 快照仅随新类名 +2 行。
  - **范围与基线**：增量 diff 只触 editor UI/测试/采用登记/文档/baseline；reforge、content、
    editor core、play.ts、migrate、projects、data 零 diff。baseline 7400→7404 恰 +4
    （UI 7→10、leave-guard 31→32），editor 2514→2518，无缩范围。
  - **本席复跑**：battle-simulator-ui 10 项+App.leave-guard 32 项全绿（含新 picker 两条、替换
    确认、快捷入口确认四条新工作流）；add-picker/field-commit/boundary 采用门 68 项全绿。
    check7895/ratchet/strict7404/build 与四尺寸视觉采信 Codex 已落证据，本人不重复视觉。
  - **披露边界**：原生目录选择器/360 主壳/full-Q1-Q2 旧边界如实保留，判断同前不阻断。
    旧版本兼容审查 pass：仅编辑器 UI 采用方式变化，无格式/兼容分支。
  - 返工项：无。
- GLM：**accept（2026-09-20，UI-r1 候选 fe0fee84 对比 cb44c378；代码级交互/采用清单复核，未做视觉）**。
  本席独立复跑与直读证据：
  - **定向复跑全绿**：`scripts/battle-simulator-ui.test.tsx` 10/10、`src/ui/App.leave-guard.test.tsx`
    32/32、add-picker/field-layout/number-field 三采用门 14/14。
  - **增量范围直读**：`git diff cb44c378..fe0fee84` 仅编辑器 UI（App/Forms/Workbench/TrialDialog/
    battle-simulator.css）+ 采用 JSON + 两个测试文件 + 基线 + 文档；**零 Reforge/模型/作者保存/
    普通存档/引擎改动**，与「只改采用方式与交互」声明一致。
  - **业务断言核对**（测试标题+正文直读）：party picker 选择/取消零命令、确认只追加一次、
    undo/scope 失效弹窗；bag picker 明确确认/取消搜索/stale revision/删除归焦/undo 保作者事务边界；
    临时方案替换须确认、取消保留编辑、来源变化撤销过期确认；快捷入口新 leave-guard 用例钉
    「取消保持 72→明确放弃恢复 100、EditSession 深等不变、不 dirty、不触发目录选择器」——
    取消/Escape/单次确认/重复排除/undo失效/删除归焦/两入口覆盖确认全部有真实断言。
  - **采用登记精确一致**：add-picker included 5→7、dataPaths 6→16，恰为 `simulator/party`+
    `simulator/bag` 两条新登记（各 5 条数据路径），与源码 `BattleSimulatorForms.tsx:114-115/:462-463`
    的 `DsAddPickerDialog adoptionId` 逐一对上，verification marker 指向本人复跑绿的测试标题；
    旧登记/deferred 零删除（删除行均为计数与组件清单/普查行更新：field 清单加 DsAddPickerDialog、
    responsive 1→3、census 轨道 24rem→16rem auto-fit，全部为扩容或机械再生成）。
  - **基线精确性直读**：`baseline.fast.json` diff 仅计数/digest（7400→7404 恰 +4：UI 7→10、
    leave-guard 31→32），零排除增删、零范围文件增删，无缩范围。
  - 旧候选的机制/隔离/负控结论未变化，按卡面保留不重开；视觉四尺寸归 Codex。无 counter。
- done准入（fe0fee84主体）：**三席审查门已通过**，d394eccc列宽增量三席亦已确认；用户最终UI验收通过，已由Codex统一done，详见顶部核定。

### UI-r1并行交接提示词

**Kimi：**

```text
在 /Users/zhangxu/illegal/type-pal 增量复核 EDITOR-SKILL-TRIAL-1，任务卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md（review），UI-r1候选fe0fee84，对比cb44c378。
先同步main并检查工作树，读AGENTS/CLAUDE/READ-FIRST、卡面当前UI-r1节与docs/testing/battle-simulator-implementation.md；r2/r2a设计不重签，未改引擎/存档的旧accept按历史保留。
重点核公共DsAddPickerDialog的scope/revision/确认前零修改/撤销失效，临时配置两入口覆盖确认及来源变化失效，命名命令与临时草稿隔离；核限宽/自适应列/间距未私改公共控件默认尺寸。按需复跑UI和App.leave-guard相关测试，不重复Codex视觉、不跑官方覆盖率或改基线。
Codex最终check7895、ratchet与保护strict7404、build通过，四尺寸视觉已验；原生目录选择器/360主壳/full-Q1-Q2旧边界仍披露。不要读取或复述GLM的新结论。只在当前UI-r1 Kimi席位及本人日志写accept或file:line反证counter，提交推送；保留他席改动，不改实现/状态、不标done。
```

**GLM：**

```text
在 /Users/zhangxu/illegal/type-pal 增量复核 EDITOR-SKILL-TRIAL-1，任务卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md（review），UI-r1候选fe0fee84，对比cb44c378。
先同步main并检查工作树，读AGENTS/CLAUDE/READ-FIRST、卡面当前UI-r1节与docs/testing/battle-simulator-implementation.md；不重签r2/r2a设计，旧机制accept原文保留。
复跑packages/editor的scripts/battle-simulator-ui.test.tsx（10项）、src/ui/App.leave-guard.test.tsx（32项）及add-picker/field-layout/number-field采用门。核取消/Escape/单次确认/重复排除/undo失效/删除归焦/两入口覆盖确认的业务断言；采用登记5→7、6→16与源码精确一致，旧deferred未变化，覆盖率新增恰4项且无缩范围。
Codex统一完成check7895、ratchet和保护strict7404、build；不补跑全仓覆盖率、不改基线、不操作浏览器或判断截图。不要读取或复述Kimi新结论。只在当前UI-r1 GLM席位及本人日志写accept或直接证据counter，提交推送；同步保留他席改动，不改实现/状态、不标done。
```

交接日志（Codex，2026-09-20）：按用户UI反馈完成同卡返工；fe0fee84供两席并行增量复核，原技术签字均原样保留。
本轮只是界面/交互收尾，不扩张为新快捷入口、战斗功能或全量E2E授权。

交接日志（GLM，2026-09-20 UI-r1）：完成 fe0fee84 增量代码级复核并签 accept（证据见 done 前
本席）：UI 10/leave-guard 32/采用门 14 复跑全绿；增量 diff 零引擎/模型/存储改动；两条
DsAddPickerDialog 采用登记与源码逐一对上（5→7/6→16，旧登记零删除）；基线恰 +4 项零缩范围；
取消/确认/undo/归焦/覆盖确认业务断言齐全。未读 Kimi 新结论，未做视觉，未改实现/基线/状态，
不标 done。

## 历史实现接收（2026-09-20，统一候选cb44c378）

相对主线基点`1bae48e4`；产品候选`bd4c67c6`，`cb44c378`包含同树官方覆盖率基线和实施回执。
r2/r2a首批已实现，进入review；**done门未开放，不代签**。详细源码/测试/失败修正/视觉边界见
[实施记录](../../../../testing/battle-simulator-implementation.md)。本卡测试由Codex编写，不把GLM其它补测包当作独立证明。

用户本轮指出的图标偏色、横跨整行按钮和技能选择均已处理：恢复既定彩色/灰/暗红三态、不改HUD布局；
同行操作与容器自适应列复用现有规范；指定技能用可搜索勾选多选与计数。人数勘误不变，不扩展其它业务页新快捷入口。

### done前（r2/r2a，候选cb44c378）

- Codex：**accept（实现者自验，2026-09-20）**。完整check7891项、官方ratchet、保护基点1bae48e4的
  单次strict-fast7400项、editor生产build通过；S1四针/runtime六针均有同输入正控和钉名业务红。
  实看非PAL自有工程施法/投掷/三人战斗与结算、停止/重开、计数多选、图标三态和宽窄表单；正常存档零IO
  由真实宿主+真实入口路由+实际BattleSession行动三层回归证明，不冒称全链无桩。
  已披露：浏览器原生目录选择器返回取消，保存→重开正向浏览器链未通过，S1真实writer/loader/事务集成通过；
  360宽不满足既有主壳最小列宽，未声称移动端完成；full/Q1/Q2未跑。上述限制交独立席判断，不隐瞒。
- Kimi：**accept（2026-09-20，统一候选cb44c378对比1bae48e4；全部锚点本人直读/主树复跑，结论形成于读他席前）**。
  落盘期间本卡因用户 UI 反馈转 rework（见顶部「当前UI返工」）：本签仅覆盖 cb44c378 的代码级
  保存/隔离/握手/资源/战斗复用机制，按卡面约定留作历史技术证据，**不含 UI 验收、不授权旧候选
  done**；UI 返工后的新候选需增量复核。
  - **保存事务闭环**：`battle-simulator-library.ts:183-203` 缺席（NotFound）与坏 JSON/权限错区分，
    `BattleSimulatorDocumentError` 在 `open-local.ts:88` 原样抛出保留路径与重开提示；`project-io.ts:657-660`
    preflight 对附属 JSON 提前解析、`:341-344` 仅非空才落文件；`App.tsx:2217/:2359` 保存/另存两条
    实际回调都接 `battleSimulatorRemovalPaths`（`:88-92` 缺席/空库显式删除，覆盖重开后首存）；
    `clone.ts:88-99` 原始字节逐字节携带；`author-disk-baseline.ts` 把缺席记为 null 且先前后退即
    AuthorSaveConflictError——缺席进入字节基线。S1 四针（open/preflight/absence/delete-after-open）
    本人复跑全 detected、四对照 PASS。
  - **存档隔离**：`play.ts` 试打分支在 normal boot 前早分流并 return，不构造 SaveStore；
    `battle-trial-host.ts:1` 明示无 save store 依赖、`:125-128` F5/F9 拦截仅提示；临时 world 由
    `battle-trial-prepare.ts:205-215` buildWorld 新建，`battle-trial-session.ts:60` 与
    `battle-world-result.ts` 的奖励/收尾只写该临时 world。宿主测试「不构造任何 SaveStore」绿。
  - **一次性握手与 revision 复验**：`battle-trial-launch.ts` 同步 window.open 保手势、配置只走
    MessageChannel（`:48` 不进 URL/存储）；`check()`（`:107-126`）双 assertCanLaunch+双 sourceToken+
    revision；重开 `:165-172` 换新 launchId，已 ack 后重复 ready 即 fail；接收侧 `:234-242` 校验
    origin/source/identity/launchId/单 port/64hex revision。`battle-trial-assets.ts:113-116` 准入
    与 `:253-260` 准备后**从 source 重载**复核 token+revision。
  - **资源/取消/AudioContext 收尾**：快照 `battle-trial-assets.ts:53-102` 缓存留存 slice、交付
    再 slice、catalog 字节/SHA 不符即拒、seal 后未冻结路径禁读、urlFor 拒绝；`abortableTrial`
    迟到成功也拒；prepare 异常/迟到双路 dispose；`bgm.ts` dispose 幂等且 initialize 两道
    disposed 检查、迟到 init 只 pause 不播；宿主 abort→session.cancel+cleanupRun+releaseResources，
    finally 卸外部监听。
  - **正式战斗复用**：`battle-player-input.ts` 与 `battle-world-result.ts` 系 main.ts 原内联
    逐字段提取（本人逐行比对删除块）；main.ts 与临时宿主共用同一函数；`main.ts:2232` 空敌队
    由桩胜改为 throw；`createBattleTrialSession` 用真实 BattleSession 同形 options。
  - **人数/旧入口/图标**：`battle-trial-config.ts:25/:116-117` 我方≤3 拒绝、prepare `:150` 敌方
    ≤5 槽；`main.ts:345-347` `?battle-trial`/`?skill` 在 SaveStore（`:583`）前拒绝，旧授技内联已删，
    DEV 面板 grantSkill（`:7007`）保持内存态独立调试；battle-ui 图标改 chrome 自有 ICON_GRAY/ICON_RED
    色带+WeakMap 按位图缓存，不动工程色盘/HUD 布局。runtime 六针（fourth-member/source-bytes/
    late-admission/save-hotkey/skill-injection/music-release）本人复跑全 detected、六对照 PASS。
  - **本席复跑**：两组负控工具 exit0；reforge 定向 8 文件 64 项、editor 定向 6 文件 46 项全绿。
    完整 check7891/ratchet/strict7400/build 采信 Codex 已落证据，未重跑官方基线。
  - **披露边界判断**：原生目录选择器在自动化返回取消致浏览器保存→重开正向链未过——该链由 S1 真实
    writer/loader/事务集成与 persistence 13 项覆盖，非 mock 替代，不阻断；360 宽沿既有主壳限制、
    full/Q1/Q2 未跑均如实披露，不构成本批阻断。旧版本兼容审查 pass：严格当前格式 v1，
    无旧版兼容分支。
  - 返工项：无。
- GLM：**accept（2026-09-20，统一候选 cb44c378 对比 1bae48e4；代码级矩阵/回执复核，未执行视觉）**。
  本席独立复跑与直读证据：
  - **两组负控本席复跑 rc=0**：S1 `battle-simulator-s1-mutants.mjs` 4 对照 PASS + 4 针（open/preflight/absence/delete-after-open）
    全 detected(AssertionError)；runtime `battle-simulator-runtime-mutants.mjs` 6 对照 + 6 针（fourth-member/source-bytes/
    late-admission/save-hotkey/skill-injection/music-release）全 detected(AssertionError)。
  - **V3/r2a 直读**：`battle-trial-config.ts:25` `TRIAL_MAX_PARTY_MEMBERS=3` 且 `:116` 拒第 4 人、`:124` 拒重复角色；
    `parseTrialEnemies:176` 强制 5 槽含 null 空槽（敌方五槽不误伤）；stats 仅显式覆写（level/maxHP≥1、其余≥0，
    无等级自动推导）；equipment 缺席继承/null 显式脱下；skills 仅 inherit|replace；hp/mp 支持 value:0（MP0）；
    music default|silent|asset（静音一等态）；strict JSON（未知字段/稀疏数组/原型链全拒）。
  - **V6 直读** `battle-trial-prepare.ts:70-161`：八类悬空引用（角色/战场/音乐/装备槽/授技/技能/敌队/敌人/背包）
    全部产生带 path 定位 error，无静默换第一候选；空队伍/全员 HP0 不可启动；maxPool 效果如实 warning
    「当前引擎尚未执行」不伪造；装备校验槽位+equipableBy 白名单。
  - **V5 直读**：`main.ts` bootGame 在 shop-trial 解析前对 `battle-trial|skill` 参数直接 throw（旧 ?skill 无静默
    兼容）；缺敌队桩胜已删除改 throw；`play.ts` 试打分支经同一身份/授权/`loadPlayProject`/身份断言链且不回落
    普通 boot，每个 await 后 `active()` 查取消；四个 trial 模块 grep 零 SaveStore/indexedDB/Storage 引用。
  - **V7/V8 直读**：`battle-trial-launch.ts:60-176` 一次性 randomUUID launchId + origin/source/protocol/kind/launchId
    五重校验 + sent 单次门 + sourceToken 双读防保存态漂移 + restart 换 nonce 保初始配置；session 用真实
    `new BattleSession` + 共享 `settleBattleVictory/finishBattleWorldState` 只写临时 world；`battle-player-input.test.ts`
    钉 `{world,project}` 深等不变（同实参保真）与 carried 数组 detach。
  - **fixture 直读**：`battle-trial-project.ts:150-152` 完整工程先过 `loadCurrentProjectFrom` 正式 loader 才作 fixture。
  - **定向抽查全绿**：reforge config/player-input/icon 36 项 + scripts 运行时 28 项 + editor
    library/persistence/launch/entry/UI 45 项。
  - **基线精确性直读**：`baseline.fast.json` diff 仅计数/digest 更新（7277→7400 项、617→631 源文件），
    零排除增删；design-system 断言 27→31 页/101→109 滚动/92→95 文件均为精确扩容，evidence-bound exceptions
    保持 2 不变（无新豁免），并新增 path-escape 拒绝与 adoption 针唯一性两条更强断言。
  - **披露边界确认**：原生目录选择器自动化返回取消（浏览器保存→重开正向链未过，由 S1 真实事务/writer/loader
    集成证明代替）、360 宽受主壳最小列限制、full/Q1/Q2 未跑——回执如实披露，视觉归 Codex，本席不以非视觉
    证据冒充。无 counter。
- done准入：关闭，等待两席独立结论与用户最终验收。

### 旧候选终审提示词（已暂停收口，不作为新UI的验收）

**Kimi：**

```text
在 /Users/zhangxu/illegal/type-pal 独立终审 EDITOR-SKILL-TRIAL-1，卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md，review。
先同步main并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡r2/r2a与 docs/testing/battle-simulator-r2-design.md、battle-simulator-implementation.md。
统一候选cb44c378，对比1bae48e4；设计不重签。重点独立核：附属库保存/删除/重开与原事务/身份闭环；URL严格早分流、一次性握手和revision复验；私有资源快照/取消迟到/AudioContext收尾；正式玩家派生、BattleSession及奖励只写临时world；我方1～3人/敌方5槽、旧?skill拒绝、未扩新入口。
核本轮图标恢复三态/动态列/技能多选没有改规则或污染定义；normal DEV grantSkill仍属独立调试，不是试放入口。按需复跑两组负控与定向；不要重复Codex视觉，不重跑全仓覆盖率或改基线。
证据：check7891、ratchet/保护strict7400、build通过。原生目录选择器返回取消，浏览器保存重开正向未通过但S1真实writer/loader集成通过；360窄屏沿既有主壳限制；请独立判断披露边界是否阻断。
不要读取或复述GLM结论。只写本卡当前Kimi席位accept或带file:line/反证的counter与本人交接日志，提交推送；不改实现/他席/状态，不标done。提交前同步保留他席改动，冲突自行rebase处理。
```

**GLM：**

```text
在 /Users/zhangxu/illegal/type-pal 独立复核 EDITOR-SKILL-TRIAL-1，卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md，review。
先同步main并检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡r2/r2a、docs/testing/battle-simulator-r2-design.md 与 battle-simulator-implementation.md。
统一候选cb44c378，对比1bae48e4；设计不重签。按V1～V10核对声明/最终树/用例：四目录真实保存链、删空/坏文件/悬空引用、数值继承/覆写/装备只加一次、MP0/静音、三人上限、隔离存档、真实行动/奖励与取消重开。
复跑 node docs/testing/battle-simulator-s1-mutants.mjs（4对照+4针）及 battle-simulator-runtime-mutants.mjs（6对照+6针）；抽查定向test与fixture先经正式loader、同一实参保真。运行时4文件位于packages/reforge/scripts；UI/握手/入口在packages/editor/scripts。
完整check7891、官方ratchet/保护strict7400、build由Codex统一完成，不补跑全仓覆盖率、不改基线。核4新目录组件采用清单与两处断言更新确为精确扩容，没有新豁免。原生选择器取消和360窄屏限制已披露，不能写成浏览器保存重开/移动端通过。
不操作浏览器或做截图/视觉，不使用Mimosa，不读取或复述Kimi结论。只写本卡当前GLM席位accept或带直接证据的counter与本人日志，提交推送；不改实现/他席/状态、不标done。两席均由Codex统一核门禁。
```

## 2026-09-20阶段门禁核定（Codex）

**build allowed，仅恢复已批准的r2范围并应用r2a人数勘误**。核Codex本席原签、GLM `1a44c3c6`、
Kimi `99bd6969` 均钉r2a，分别premise verified/design agree、带独立证据、无counter；与原r2主体三席
（Codex原签、Kimi `9aac034c`、GLM `444cad25`，准入 `af916f5b`）合并判断，不借r1旧签授权。

界面门分开保留：r2记录已确认四目录/快速入口流程的大方向及保存方式，不等于所有入口UI细节已确认或正式视觉验收。
**任何仍标为待用户确认的入口UI形态、未获准的新入口或形态变化仍不得实施；本次人数补签不将它们开放。**
r1旧小弹窗的“待确认”只作为历史记录，不恢复该方案，也不拿它推翻r2已经获准的方向。
我方1～3人、第四人拒绝、敌方五槽不动；不改正式HUD、不新增五人扩展任务、不保五人格式兼容。
本轮按用户要求只读取签字/既有证据并同步文档：不重跑测试、不改实现、不宣称功能完成；done门仍关闭。

## r2a当前裁决：我方1～3人，敌方五槽

用户原话：“另外我方本来就是1-3人，游戏里不会有超过3人的情况”。这是纠正Codex多推导的人数需求，
不是新增五人功能、不是“先砍到三人以后再做五人”。**本卡及后续队列不再预留我方4～5人扩展任务。**
没有授权改正式战斗UI、公式、普通游戏存档或迁移内容。

前提补核：用户给出产品人数真值；SDL参考`reference/sdlpal/palcommon.h:42`的MAX_PLAYERS_IN_PARTY=3，
`:48`的MAX_PLAYABLE_PLAYER_ROLES=5表示可用角色总数，不表示同时出战人数。第一阶段与正式Reforge的三人信息栏
源码见下方四向矩阵，1～3人栏起点91/168/245均在320逻辑画面内；其余站位行不能覆盖产品上限。
目标变为：配置草稿可为空，但启动我方必须1～3人；第4人不得保存为合法配置或进入启动包，敌方仍最多五个语义槽。
残留5人WIP尚未对外合入，不保留旧格式兼容。合法三人菜单/选人/施法/结算仍须开发期功能验证。

### r2a定点签字（只核人数勘误，不重审未变化的保存与界面方向）

- Codex：**premise verified / design agree（2026-09-20）**。本人直读上述SDL常量、第一阶段信息栏及Reforge实际调用，
  与用户澄清一致。可证伪：第四我方仍能通过配置守卫/快速入口进入试打，或限人数时误将敌方五槽缩成三槽；均返工。
  实施应统一配置守卫/UI/fixture边界并补三人合法/四人拒绝，不改战斗HUD、不保活五人兼容。
- Kimi：**premise verified / design agree（2026-09-20，r2a，只核人数勘误；保存/隔离/四目录不重审；全部证据本人直读，未读 GLM 结论）**。
  - **人数真值直读**：`reference/sdlpal/palcommon.h:42` MAX_PLAYERS_IN_PARTY=3（同时出战）、
    `:48` MAX_PLAYABLE_PLAYER_ROLES=5（可用角色总数非出战数）——用户原话「我方本来就是
    1-3人，游戏里不会有超过3人的情况」与 SDL 常量语义一致，不是新功能也不是「先砍后扩」。
  - **UI 完整支持边界直读**：一阶段 `draw-battle-ui.ts:64-67` 信息框 x=91+77×i（i=0/1/2 →
    91/168/245，245+75 框宽恰达 320 右缘；i=3 → 322 越界）；Reforge `battle-ui.ts:24-25`
    同 91+77 步长，`battle-session.ts:2846` 文字兜底 x=8+106×i（i=3 → 326 越界）——
    两阶段正式 UI 均无第四人完整显示能力，且均无分页/重排逻辑。**站位表存在≠完整支持**：
    `battle-positions.ts:29-36` PLAYER_POSITIONS_BY_COUNT 有 4/5 档精灵落点，但信息栏越界
    使「完整支持我方五人」不成立（原 counter 源码核验正确）。
  - **敌方五槽独立真值直读**：`battle-core.ts:67` MAX_ENEMIES=5、`:322-325` createBattleState
    敌槽上限、`battle-positions.ts:39-60` ENEMY_POSITIONS_BY_COUNT——我方限 1~3 不得误缩
    敌方五槽语义。
  - **设计同意**：配置草稿可为空、启动我方必须 1~3 人；第 4 人在配置守卫/快速入口/启动包
    三处一致拒绝；敌方仍为 5 个明确槽位+至少一个真实敌人+null 空槽；残留 5 人 WIP 不合入、
    不留我方 4~5 人扩展任务、不保旧格式兼容；合法 1/2/3 人菜单/选人/施法/结算开发期功能
    验证保留；不改正式战斗 HUD/公式/存档/迁移。
  - **可证伪观察**（任一反例即 counter）：① 第四我方能通过配置守卫或快速入口进入试打并
    正常结算；② 限 1~3 实现把敌方 MAX_ENEMIES=5 或敌队 UI/编队槽缩成 ≤4；③ 合法 1/2/3 人
    试打的信息栏/站位/结算回归失败；④ 以站位表 4/5 档存在重新论证五人可完整支持；
    ⑤ 残留 5 人 WIP 合入主线或保留五人兼容格式。
  - 返工项：无。补核范围声明：仅核人数勘误，未重审未变化的保存事务/隔离宿主/四目录设计。
- GLM：**premise verified / design agree（2026-09-20，r2a）**。本人直读一手证据，未读 Kimi 结论：
  - 人数真值：`reference/sdlpal/palcommon.h:42` MAX_PLAYERS_IN_PARTY=3（同时出战）与 `:48`
    MAX_PLAYABLE_PLAYER_ROLES=5（可用角色总数，非出战数）——用户澄清「我方本来就是1-3人」与
    SDL 常量语义一致；一阶段 `packages/game/src/present/battle/draw-battle-ui.ts:63-67` 信息栏
    x=91+77×i（本席独立复算：i=0/1/2 → 91/168/245，245+75 框宽恰达 320 右缘；i=3 → 322 越界），
    `:405` 起逐 players 绘制；Reforge `battle-ui.ts:24-25` 同 91+77 步长，`battle-session.ts:2846`
    文字兜底 x=8+106×i（i=3 → 326 越界）——两阶段正式 UI 均无第四人完整显示能力。
  - 敌方五槽不受误伤：`battle-positions.ts:29-36` PLAYER_POSITIONS_BY_COUNT 表本身有 4/5 档
    （站位表存在≠UI 完整支持，不能作五人证据）；敌方 `ENEMY_POSITIONS_BY_COUNT`（`battle-positions.ts:39-60`）
    与 `battle-core.ts:67` MAX_ENEMIES=5、`:322-325` createBattleState 敌槽上限 5 是独立真值，
    我方限 1～3 的守卫不得压缩敌方五槽语义。
  - 回归边界矩阵（本席核对 r2a 裁决文本与设计文档 §2/敌方预设行）：配置草稿可空、启动必须
    1～3 人、第四人在配置守卫/快速入口/启动包三处一致拒绝、敌方仍为「5 个明确槽位+至少一个
    真实敌人+null 空槽」；残留 5 人 WIP 不合入、不留我方 4～5 人扩展任务、不改正式战斗 HUD/
    公式/存档。设计与已冻结保存/隔离/四目录约定无冲突。
  - 可证伪观察（任一出现即 counter）：第四我方能通过配置守卫或快速入口进入试打并正常结算；
    限 1～3 人实现误把敌方五槽上限缩成三槽；敌队 UI/编队槽从 5 变 ≤4；合法 1/2/3 人试打的
    信息栏/站位/结算回归。前两条 Codex 席已同述，第三条为本席补充的敌方侧回归边界。
  - 补核范围声明：仅核人数勘误，未重审未变化的保存事务/隔离宿主/四目录设计，未复跑
    skill-trial-premise 探针（人数前提由用户澄清+SDL/UI 源码直读即可判真，无需间接探针）。
- build准入：**build allowed（Codex，2026-09-20）**；r2a三席同版齐、无counter，随已批准r2主体恢复build；入口UI待确认项不因此开放，done仍关闭。

## 2026-09-20人数counter（历史，产品选择已由上方r2a澄清）

**Codex counter / blocked**：此前用1～5人站位表确认首版人数，未充分核验完整战斗界面；
正式信息栏第4人起超出320逻辑像素画布。不能把“能放下精灵”当成“完整支持五人”。
本次为直接源码/调用链核验，不冒称已经浏览器复现。已停止受影响实现，当前代码仅留隔离WIP检查点，未并主线。
检查点`83ade2ef`位于`codex/editor-battle-simulator-r2`：四目录/独立宿主/快速入口为未完成实现，
两包typecheck与改动25文件Biome通过，4文件69项通过；完整战斗/浏览器/全仓质量门尚未执行，不交终审。

| 真值面 | 一手证据与结论 |
|---|---|
| 原版/primary source | 原版没有本次创作模拟器，N/A；本轮未复跑原版实机，不能据此裁定原版支持五人。新模拟器人数取舍由用户决定 |
| 第一阶段 | `packages/game/src/present/battle/draw-battle-ui.ts:64`的起点91、步长77，`:405`按玩家下标绘制；不是可分页五人信息栏 |
| 当前二阶段 | `packages/reforge/src/battle/battle-positions.ts:7`存在1～5人精灵站位；但`battle-ui.ts:24`与`:157`信息栏x=91+77×slot，slot3/4为322/399，超出320；`battle-session.ts:2820`起逐人直接传i，`:2846`文字兜底x=8+106×i也从第4人326起越界，没有分页/重排 |
| r2目标 | “复用正式界面且完整支持我方1～5人”当前不能同时成立；敌方五槽不受此反例影响 |

最强替代解释是调用方已分页、压缩或改变逻辑画布；核实际drawPlayerInfoBox调用与fallback均无此逻辑，
新独立宿主仍320×200逻辑画布。若能出示正式五人流程中完整可见/可操作的全部信息栏及调用链，才推翻本counter。
该问题是显示布局边界，不是迁移数据错误、地图/资源解码错误，也不授权修改生成内容或战斗公式。

当时提交的选项（历史；现已澄清我方只有1～3人，不再待选）：

1. **建议首版我方1～3人**，复用不变的真实战斗界面；我方4～5人另排正式引擎界面扩展。
2. 本次同时扩展**正式引擎**的战斗界面以完整支持4～5人；需先修订受影响设计/验收，不另造模拟器专属假界面。

`before → after`：r2声明首版1～5人且无需扩展界面 → 选择1后首版最多3人；或选择2后先完成正式五人界面设计。
代表场景：添加第4位我方队员时，是明确限制并说明，还是能够完整显示其状态和操作。
原r2签字原文保留历史；涉及1～5人的前提与授权暂失效，用户裁决后对受影响前提/设计补核，
不重问四目录、工程保存、正常存档隔离等未改变的产品选择；不代签、不标done。

定点补核提示词已执行完毕，仅留历史；后续由Codex继续已批准范围，GLM各批接收独立。

## r2本轮推进（GLM返工期间独立准备）

实施进展见[独立工作树回执](../../../../testing/battle-simulator-implementation.md)：已落S1配置/命令与保存基础；
真实试打、完整UI和引用诊断尚未接入，当前不交终审。可重建四针负控见同附件；不修改GLM返工树或官方覆盖率基线。

已将方向收敛为[首批冻结设计](../../../../testing/battle-simulator-r2-design.md)，包括真实源码四向证据、
四目录字段/继承/覆写、推荐工程内文件、现有保存事务/撤销/重开接入、一次性内存启动协议、10组验收边界。
同任务交互草图已制作；用户在确认“只是示意图、内容不完整”后明确“大方向我觉得没问题”。
据此记录四目录布局/操作流程的大方向通过，不再重复询问；不是逐字段清单或正式产品视觉验收通过。
草图不是实际 BattleSession，也未修改编辑器导航。“本场临时调整”不限技能，技能仅作例子；完整范围以冻结设计为准。

本卡r2首批范围：四类基础配置完整保存/重开→独立真实战斗/结算→技能/敌队共享入口，并接回已有单敌试打入口。
敌方残血/初始毒/状态需新增正式初始化能力，留第二批，不在首版挂无效控件；其他业务页新按钮随后复用。
不把所有拓展升为Q1/Q2的额外门槛。实现后仍须Codex功能视觉验证，草图不抵扣。

用户对再次明确的两项保存方式答复“好的”：①命名预设/方案随工程保存，战斗结果不保存；
②首版先保存工程再试打，本场临时调整不必另存预设。保存方式和草图方向均不再重问。
这不是三签豁免；2026-09-19原r2开build、人数counter后暂停，现r2a三席补齐并核定恢复已批准范围，done仍关闭。

### build前（r2冻结设计，独立于下方r1历史签字）

- Codex：**premise verified / design agree（2026-09-19，r2保存裁决后冻结，生产e58834f6）**。
  本人核验SkillTab/main入口与保存路径、character实例/装备派生、battle-core:322和battle-session:418初始化时序；
  读author-disk-baseline:60/85/120/185实际字节基线及新路径缺席校验、project-io:153准备写集验证/:372身份域保护、
  open-local:37稳定读取与export-zip:66/93完整树备份。入口缺陷归编辑器/宿主，不归迁移；新配置加入原作者事务/历史，
  不写受保护身份域，不建普通或特殊前缀SaveStore。共用正式BattleSession/派生/结算且只写临时world；
  首批不靠事后改私有敌状态假装支持残血/毒。用户保存/隔离/界面方向已明确，技术边界见附件V1～V10。
  可证伪观察：附属配置绕过磁盘基线/准备写集校验；握手失败回落普通boot；试打正常槽IO非零；
  正常战斗提取后行为改变；本场调整反写原预设；缺真实敌队仍返回胜利。任一出现即counter，不用mock/覆盖率代替业务验证。
  本轮复跑原前提探针exit0：scene=start、sessions=0却victory；savedAfterMaxMP=999、savedTrialSkill=true、
  authorInputUnchanged=true。证明修复前提仍成立，不宣称新模拟器已实现。文档工具20项通过；任务更名触发索引不同步，
  按生成器输出同步唯一对应行后重跑文档检查；不忽略该失败、不改变门禁。
- Kimi：**premise verified / design agree（2026-09-19，r2 冻结设计，生产 e58834f6；全部证据本人直读/复跑，未读 GLM 结论）**。
  - **入口缺陷前提复核**：r1 前提不变且本人复跑原探针 exit 0（scene 回退 start、sessions=0
    桩胜、savedAfterMaxMP=999/savedTrialSkill=true 污染同 scope、作者输入不变）——
    「当前 SkillTab.tsx:1117 固定 s001/0 链接 + 缺敌队桩胜 + 临时授技入普通保存链」
    三缺陷仍成立，根因在编辑器/宿主入口，不归迁移。
  - **附属配置事务边界直读**：`author-disk-baseline.ts:60/120/185` 实际读字节采集+新路径
    缺席校验；`project-io.ts:153` 准备写集校验、`:372` 身份域禁写；`workspace-context.ts:13`
    整个 `.type-pal` 受保护；`open-local.ts:37/77` 稳定读取内交付基线；`export-zip.ts:66/93`
    完整作者树备份只排 save-recovery——设计 §5 的接入点全部真实在位；`editor/battle-simulator.json`
    固定路径+kind/version:1 严格格式、不入 .type-pal/localStorage/SaveStore/内容表、
    不经版本升级（铁律 11 合规）、损坏 fail-loud 不清空、悬空引用可修复但禁启动——
    闭合完整。
  - **一次性握手与取消**：URL 仅身份+一次性 launch ID、完整配置走 postMessage 精确
    origin/source/launchID/工程/工作区校验+MessageChannel 单次交付；接收器在普通 boot/
    标题/SaveStore 构造前早分流且**明确不回落正常 boot**；迟到回调不构造 session/播音/
    交帧、单 flight、双端关闭即取消——取消收尾闭合。
  - **正常存档零 IO**：shop-trial 早分流先例（main.ts:353-360）核实；试放宿主不构造任何
    SaveStore、不注册正常 save/load/checkpoint；F5/F9/自动存档禁止且明示临时模式。
  - **正式战斗派生/结算复用直读**：`character.ts:252` instantiate 复制 baseStats（改等级≠
    捏造数值）；`main.ts:2280+` 装备/抗性/状态在建态时 live 派生（红线）；`battle-core.ts:322`
    槽上限与 EnemyDef/null 输入；`battle-session.ts:418` 构造即 stepBattle——事后塞初始状态
    不成立（首批敌方满血无毒边界正确，第二批须先设计正式初始化输入）。最小提取
    battle-player-input 共用须钉提取前后参数等价（V3/V8 已列）。
  - **范围边界**：1~5 人按现行站位表不扩容；敌方逐槽残血/毒/状态与高级覆写明确留第二批
    且首批不存无效字段/不挂无效控件；不复制 AI 编辑器/虚构敌方装备池；不扩成 Q1/Q2 门槛。
  - **用户裁决核对**：四目录大方向+预设随工程保存+首版先保存工程+本场调整不另存+战斗结果
    不落盘，逐条有用户明确答复记录——不重问这些产品选择。
  - **可证伪观察**（任一反例即 counter）：① 附属文件绕过磁盘基线/准备写集校验；② 握手失败/
    刷新回落普通 boot；③ 试打期间任何正常槽 IO 非零；④ 玩家输入提取后正常战斗参数变化；
    ⑤ 本场调整反写原预设；⑥ 缺真实敌队仍返回胜利；⑦ 重复角色/非法配装/悬空引用可启动；
    ⑧ 旧 launch ID/重复包/异 origin 被握手接受；⑨ 旧 ?skill 捷径仍可静默到达。
  - 返工项：无。非阻断备注：EditorState/toEditorState/serializeProject 接入编辑器专属文档是
    S1 面内必要工作，实施时须证明不改变内容校验对外合同；草图非产品视觉验收，dev-functional
    视觉归 Codex。
- GLM：**premise verified / design agree（2026-09-19，r2 冻结设计，生产 e58834f6；证据全部本人直读/复跑，未读 Kimi 结论；本席审数据/配置/持久化/失败矩阵，不做视觉）**。
  - **前提探针本人复跑**（`node --import tsx docs/testing/skill-trial-premise.mjs`，exit 0）：
    SSR 链接仍 `scene=s001&battle=0&skill=`、实际场景回退 start、battleResult=victory 且
    **sessions=0**；同一 world 真实 quickSave 链 savedAfterMaxMP=999、savedTrialSkill=true、
    authorInputUnchanged=true —— D-04 桩胜与 D-05 同 scope 污染动态复现，作者输入不变，
    修复层在编辑器/宿主入口，不涉迁移/PAL 产物。SkillTab.tsx:1117 固定链接、main.ts:2238-2242
    缺敌队 `return 'victory'` 桩、:7021-7031 `?skill` 写 world 后可入普通保存链，三锚点直读核实。
  - **四类配置表达力直读**：CharacterInstance/BattlerSpec.baseStats（character.ts:187-235 /
    actor.ts:69-80）等级+七项绝对属性；instantiate（character.ts:252-263）复制 baseStats、
    无 battler 即 throw（:254）——「改等级≠捏造成长数值」「非 battler 拒绝」有真锚；
    StartWorld.seedStats（character.ts:144-145、:329-331）只覆写当前 hp/mp 不动上限 —— 设计
    「按有效最大值解析当前 HP/MP」的顺序与现行数据形状一致。敌侧 EnemyTeamDef.slots
    `Array<string|null>`（enemy.ts:108-115）保空洞、MAX_ENEMIES=5（battle-core.ts:67）、
    createBattleState（battle-core.ts:322-346）enemySlots 接受 `Array<EnemyDef|null>`、
    HP=def.stats.health 且毒/状态清空、EnemyStats（enemy.ts:30-47）无装备槽/真气池 —— 首批敌方
    「满血、无初始毒/状态、不虚构装备/真气」与现行类型完全一致。battle-session.ts:418 构造即
    stepBattle、:395 worldPartyIdentities 校验模板唯一 —— 事后塞初始状态不成立、拒绝重复角色
    模板有真实依据。1~5 人恰为 PLAYER_POSITIONS_BY_COUNT（battle-positions.ts:7-31）可表达
    范围，main.ts:676 队伍非空。
  - **装备/物品合法性**：EQUIP_SLOT_IDS 6 槽（item.ts:24）+ EquipSpec.slot/equipableBy
    （item.ts:45-49）—— 配装可按正式槽位与可穿者白名单校验；itemUseSupportsContext
    （item.ts:256-260）是 effect×context 唯一真源，battle-session usableItems/throwableItems
    （:669-698）经它筛战斗可用/可投掷 —— 「战外物品不得显示为战斗使用/投掷合法」直接落在此
    函数上，不需新分类。穿戴在 CharacterInstance.equipment、库存另存（character.ts:29-30）
    —— 背包/穿戴分离与引擎现状一致。
  - **派生/结算/静音**：main.ts:2281-2345 建态 live 派生（effectiveStat/effectiveSkills=已学∪
    装备授予/抗性/常驻状态，红线注释在位）；:2262 `battleOpts.music !== undefined` 保 null、
    :2471 null→bgm.stop —— 音乐默认/资源ID/静音三态真实；:2550-2589 与 :2625-2637
    writeBack/grantBattleRewards 均以 world 为参 —— 临时 world 隔离结算可行；:2644+ 胜利
    onDefeated 剧情链真实存在，设计「不运行场景战后剧情、方案注明边界」必要且正确。
  - **持久化守卫直读**：FileSource 契约 file-source.ts:10（真缺席=NotFoundError、其他错误传播）、
    httpSource :35 404→NotFoundError/:36 其余→Error、fsaSource 原生 NotFoundError 且
    JSON.parse 语法错传播 —— 「缺席 vs HTML200/坏JSON/未知版本」三分在现行接口成立，无需改写。
    author-disk-baseline.ts:64-74 观察读字节、:120-128 NotFoundError→null、:185-199 plan()
    新路径 null 预期+外部创建冲突明确拒绝 —— §5.2 基线/并发机制真实。project-io.ts:221-227
    addFile 路径冲突守卫、:371-374（:434-442/:634-635）身份域禁写、:411-627 单一作者事务
    （journal prepare/commit+中断恢复 resumeOwnProjectSave）、:153-184 准备写集后整工程
    reload 复验；preflightProjectWriteSet :647-650 现不校验非 catalog JSON —— 设计「附属文件
    必须过新专属结构校验」补的正是这个真实缺口。workspace-context.ts:13 `.type-pal` 整域保留
    （含大小写/尾缀别名）；project-loader.ts:324-458 只读 manifest 声明路径、不枚举未知文件
    —— 附属文件损坏不可能阻断普通游戏。open-local.ts:37-46/:76 稳定读取内交付基线；
    export-zip.ts:74 只排 save-recovery、ZIP 校验容忍额外文件；fsa-copy.ts:7-44 另存整树复制
    （排身份域）—— 另存/ZIP/沙盒转可写携带闭合。edit-session.ts:44-72 统一 undo/dirty，
    「不加第三套 undo 栈」可行。
  - **V1～V10 鉴别力**：V3 负控（装备加两次/授技烙习得/等级捏造/MP999）正中 main.ts:2281-2345
    live 派生红线；V4/V5 反桩胜、反只断 URL/toast、反回落普通 boot 与 D-04/D-05 同构；
    V2「拒绝路径断言本次作者 IO 为零（含同字节重写）」在 journal+diff 机制下可判别；V7
    entered/deferred 对应 battle-session preparationSerial/musicSerial 真实 epoch；
    shop-trial.ts:15-29 严格参数拒绝+无 SaveStore 宿主先例（shop-trial.test.ts:46-47/:76
    构造探针）可直接复用为 V5 模式；bootGame main.ts:350-359 早分流（SaveStore :590 之前）
    先例核实。
  - **可证伪观察**（任一反例即 counter）：① 附属文件绕过磁盘基线/准备写集/路径冲突守卫；
    ② NotFoundError 之外的 HTML200/坏JSON/未知版本被吞成空库或被覆盖；③ 握手失败/刷新/混合
    参数回落普通 boot 或构造任何正常 SaveStore；④ 试打期间正常槽 IO 非零或 F5/F9 读写进度；
    ⑤ 本场临时调整反写命名预设或作者定义；⑥ 悬空引用/非法配装/重复模板可启动或被静默换成
    第一个候选；⑦ 装备授技被写进习得集合或派生值被烙存后二次叠加；⑧ 删预设未提示受影响
    方案或 undo 不能原样恢复；⑨ 另存/ZIP/沙盒转可写丢失附属文件。
  - 返工项：无。非阻断备注：① §4「拒绝重复模板/非 battler/人数上限」未在任一 V 负控点名，
    实施时钉进 V1/V3；4~5 人菜单/选择/结算按设计要求实测，不以坐标表代替测试。② 「删除
    全部预设→保存→重开」的文件从有到无转换（合法删除、diffFiles 按缺席删除）建议在 V1/V2
    显式覆盖，与「丢配置文件必须红」的负控区分开。③ 设计引 file-source.ts:37，实际
    404→NotFoundError 在 :35（契约 :10），实质成立仅行号小漂移。④ open-local
    readLocalProject 的 catch 会统一包装成「canonical 内容无效」，附属文件 fail-loud 应在
    包装点前给出自己的具体路径/重试入口。
- build准入（历史，2026-09-20受上方人数counter限制）：**build allowed（Codex，2026-09-19）**。三席同钉98dfb9b1/r2：Codex原签、Kimi 9aac034c、GLM 444cad25，
  均premise verified/design agree、无counter；用户界面/保存约定已批准。产品进入实现，done准入仍关闭。
  两席非阻断备注纳入实现钉：重复角色/非battler/人数上限及4～5人真实流程；删空预设后保存/重开区别于意外丢文件；
  附属文档损坏错误保留具体路径；不改变生产内容对外校验合同。file-source404锚点更正为:35。

## 方向讨论记录（历史，现由上方r2冻结设计收敛）

用户提出：灵活配置我方成员、技能、装备、等级、数值，以及敌方成员；保存多套我方配置，避免每次重配。
技能、敌队、战场以及可以在战斗中使用或投掷的道具等编辑入口，应复用同一个战斗模拟器，而不是各建一套试打。
本次是产品方向讨论与旧方案修订；并未授权一次实现所有高级调试功能，也未决定预设文件格式/存储位置或新页面形态。

用户随后要求整体评估所有战斗相关模块。已完成[8模块27子页复用评估](../../../../testing/battle-simulator-assessment.md)：
7个直接入口、8个上下文入口/配置来源、12个保留专用验证；逐项列出可验证边界、我方预设/试打方案、三批接入与N6b/Q2依赖。
这些是建议范围，不是已获实施授权或已完成视觉验收；不把世界专用物品、剧情结局、场景遇敌全流程冒称战斗模拟器覆盖。

2026-09-19继续细化：用户认可共享方向，并要求明确双方可预设字段和专用编辑模块；评估附件已补
逐字段来源与高级项、继承/覆写/派生规则、保存与依赖告警。用户随后指出“试打”应是方案页按钮，并询问独立一级模块与道具配置归属。
修订建议为独立一级“战斗模拟器”，四个目录“我方预设/敌方预设/背包预设/试打方案”；取消独立试打管理页。
背包只存物品与数量、测试金钱归方案，不再在我方预设重复保存；从业务页进入临时方案，不强迫先建立四份记录。用户已认可对应草图的大方向，保存政策仍待确认。
用户随后认可各业务页“选完整试打方案→明确显示本场对象调整→开始试打/进入详细配置”的快速启动方向；
详见评估附件新增接入节。仅临时加技能/物品/替换战场等，不改原预设、不绕规则；未保存内容策略和完整r2准入仍未完成。
其中敌方无我方装备/真气池、初始敌血/状态需新适配、初始状态不等于事件触发等均已查当前类型/构造器；
这些仍是r2产品设计建议，不视为用户逐字段/UI或持久化方案批准，不在本轮实施。

建议的责任划分：

- 编辑器提供统一配置界面：我方队伍（成员/技能/装备/等级/基础数值）、敌方队伍、战场、测试背包（道具与数量）。
  业务页只预填本页对象：技能→待试技能；敌队→当前敌队；战场→当前战场；道具→当前道具及使用/投掷目的。
  角色/装备等入口按同一协议扩展，不复制运行逻辑。此为接入方向，首批入口清单待r2划定。
- 实际试打仍使用第二阶段现有BattleSession、装备派生、技能/道具使用与投掷路径，不另造简化伤害模型。
  不依赖开局入口、地图落点或场景onEnter来制造队伍；缺角色/敌队/战场等真实条件应明确校验，不假报胜利。
- 试打状态始终临时；只在用户显式“保存预设”时保存测试配置，不保存这场战斗的消耗/奖励/进度。
  我方预设与本次敌队/战场选择分开，使一套我方配置能测试多个对象。建议按工程隔离预设；是否随工程携带尚待方案明确。
- 测试覆写不得写回角色、装备、技能或道具的正式定义，也不得读写正常游戏存档。
  自动带入所选技能/道具要在配置里可见；不沿用r1默默拉MP至999的策略作为通用模拟器默认。
- UI应有足够配置空间；独立一级“战斗模拟器”及四个目录页、方案内执行试打的草图大方向已获认可，不把小弹窗逐层堆大；本轮不直接修改导航。

当前一手核验（Codex）：

| 事实面 | 核验与含义 |
|---|---|
| 原版/primary source | 原版无创作战斗模拟器，N/A；用户当前配置/复用诉求为产品来源，不变更原版战斗公式 |
| 第一阶段 | 战斗运行与UI知识仍按既有harvest/正式战斗系统复用；本轮没有为模拟器另定一套战斗规则 |
| 当前二阶段入口 | SkillTab.tsx:1118写死s001/0；EnemyTeamTab.tsx:414与EnemyTab.tsx:910各自拼battle链接；BattleFieldTab.tsx:323附近只有删除动作和静态预览，不能冒称已有模拟器入口 |
| 当前二阶段角色 | content/character.ts:138的StartWorld仅角色ID/资源及有限seed覆写，不是完整测试配装；:187的CharacterInstance与actor.ts:80起的BattlerSpec有等级/基础数值/装备/初始技能；instantiate(:252)复制baseStats，不按修改后的level自动推导属性 |
| 当前战斗消费 | reforge/main.ts:2280起从实例派生装备属性/有效技能；battle-session.ts:670–686分别筛选战斗可用/可投掷道具，之后走真实选择/执行。适合共享入口，不代表这些路径已经完成全量Q2验收 |
| r2目标 | 独立配置→真实战斗→丢弃本次状态；不同编辑页带入测试对象；显式保存可复用我方预设。无开局入口选择，具体持久化和UI待定 |

需要在r2解决而不能猜的点：预设存储/跨工程身份与资源引用失效、等级与数值/装备加成的关系（尤其N6b成长配置尚未完成）、
敌方临时成员编辑的界限、测试背包与使用/投掷合法性、首批接入范围与未保存工程读取合同。
是否需要工程模型/版本调整取决于预设落盘设计，不能继续沿用r1“无需版本升级”的结论。
最强替代方案是先只修旧技能入口，但它不满足本次多入口复用与预设诉求；在范围/成本比较完成前，不先实施一个随后弃用的小弹窗。
反证条件：若某配置不能经正式战斗输入表达，或必须写回作者定义/正常存档才可运行，停下重新设计，不用旁路模拟器假装覆盖。

本卡转rework，旧r1三签原文保留，但不能授权r2；先形成新方案与UI草图，再按范围变化核新准入。GLM独立补测卡继续build，不受影响。

## r1历史方案（下列原设计/签字保留，不再作为实施授权）

## 目标 / before→after

`固定PAL场景/敌队，可能桩胜；临时授技进入普通保存链 → 选择本工程真实入口/敌队，进入独立临时真实战斗；不建正常存档存储，退出后无持久改动。`
代表场景：自有工程只有start和自建敌队wolves，从当前技能试放；不得寻找s001/敌队0、不得用缺数据胜利提示代替战斗。
用户保存隔离方向已批准；拟采用的小弹窗是独立试买现有形态的复用，不新增完整前置状态编辑器。

## 前提真值门

| 维度 | 一手事实 / 目标 |
|---|---|
| 原版 / primary source | 原版没有创作编辑器的技能试放，N/A；本卡不改战斗公式/原版演出规则。当前源码和用户“不读写正常存档”裁决为直接真源 |
| 第一阶段 | 战斗展示沿用现行BattleSession对已有战斗菜单/资产约定的实现；不新设计战斗菜单、帧坐标、速度或音效公式。harvest X7/X8的异步收口教训适用 |
| 当前二阶段入口 | SkillTab.tsx:1117-1118写死scene=s001&battle=0&skill；已有SkillTab.test.tsx:257-275也把该链接当期望；seed未声明enemyTeams，场景只有start |
| 当前二阶段执行 | main.ts:2220-2253 startBattleBody缺敌队返回victory，未创建session；真实构造在:2473，tick/render在:6473-6474；临时授技:7021-7032写world |
| 当前保存 | main.ts:590构造正常SaveStore；:6843附近预读metas；:5612 doSave、:5817 quickSave共用当前world；正常脚本loadLastSave、F5/F9/菜单/auto均有正式保存入口 |
| 当前可复用边界 | shop-trial.ts:17/38及main.ts:355-359在普通世界/SaveStore之前分流；BattleSession.done/cancel/tick/render提供独立会话生命周期（battle-session.ts:341/:636/:644/:1191/:2543） |
| 目标 | 独立试放在普通boot之前早分流；不进入标题读档/SaveStore初始化/元数据预读/探索循环/自动存档，真实BattleSession承担施法，不另写战斗核 |

可重建前提：[skill-trial-premise.mjs](../../../../testing/skill-trial-premise.mjs)，
`node --import tsx docs/testing/skill-trial-premise.mjs`。
Codex本树实测：空白seed补入所选合法技能后通过正式loadCurrentProjectFrom，敌队表为空；真实SkillTab SSR链接仍s001/0，
实际场景回退start、startBattleBody返回victory且session构造次数0。
同一world真实quickSave→临时授技→真实quickSave，隔离MemorySaveStore的maxMP从0变999且含所选技能；原作者角色数据不变。
探针只更新了当前调用API，不改原审计probe；只用内存存储、idle barrier/缩略图边界替身，无真实数据库/网络/工程写入，不冒称完整浏览器流程。
初版probe漏必需animation被guard拒绝；第二版误认seed有空敌队数组，改为核实其可选表缺席；第三版上述结果通过。
日志`/tmp/type-pal-next-dual.RszK0r/skill-trial-premise*.log`。相邻SkillTab/play-url/play-workspace/load-play-project四文件45项绿。

### 替代解释与可证伪观察

- “仅场景名错误”不足：现行selector已回退start，真正缺的是敌队0，构造计数0证实没有战斗。
- “只改作者项目而非存档”不成立：作者输入确实不变，但真实quickSave链能把临时world写入同scope内存槽。
- “已被工作区隔离解决”不成立：同一个工作区的正常进度与当前试放仍共用SaveScope；另一个workspace不互串不能代替本项隔离。
- “迁移/解码问题”排除：空白seed与合法技能同样复现，不需要PAL提取资源；不能靠改projects/pal或新生成一个默认敌队修此入口。
- 推翻前提的观察：当前正式入口已从本工程选非空敌队且实际构造session；或试放无法抵达普通保存链。发生则停线重核，不机械套本方案。

## Draft设计（待三席准入）

### 1. 编辑器只配置本次入口

拟沿用独立试买的DsDialog/标准表单：当前技能只读；开局入口DsSelect默认manifest.defaultEntryId；敌队DsSelect仅列本工程非空合法队伍，
唯一候选可默认选中、多候选要求明确选择。保持“战斗中试放”术语和原位置，不在侧栏常驻新增大编辑器。
缺入口/队伍/技能/队长或所需战斗数据时明确提示去相应目录补齐；不造PAL默认/猜地图中心、不返回桩胜。
沿用“先保存再试玩”：打开与提交时分别复核主/脚本dirty、技能身份、入口/敌队是否仍存在；未保存的内存改动不冒充试放磁盘版本。
入口形式候选小样：`技能（只读） / 开局入口（选择） / 敌队（选择） / 提示：本次状态不保存 / 取消、开始试放`。
具体UI选择待用户答复；如果改为试放页选择，先更新本段再核设计，不偷偷替换形态。

### 2. 严格独立模式，不伪装成普通试玩

同源play页继续使用现有project/workspace/save-workspace身份读取已保存工程，不改句柄授权/跨项目隔离。
建议URL只含现有身份参数及`skill-trial=<SkillId>&entry=<EntryId>&battle=<EnemyTeamId>`。
参数重复、缺值、未知ID、混合menu/scene/pos/party/give/debug/field/shop-trial/battle-scene等模式在副作用前拒绝；ID按原值查表，不能parseInt或trim成另一个身份。
普通`?battle`试打合同不扩大；旧`?skill`临时授技捷径退役并给出重新从编辑器打开的提示，不留静默授技兼容通路。
main在创建正常SaveStore、读metas、开标题/普通世界之前分流到私有`runSkillTrial`并return。
**不新建普通或“特殊前缀”的持久存档槽，也不靠写入后恢复原档。** 试放宿主不构造IndexedDbSaveStore/MemorySaveStore，不注册正常save/load/DEV checkpoint出口。
本地工程读取句柄所需的editor IndexedDB访问仍允许；禁止的是正常游戏存档库/槽IO，不能把这两种数据库混为一谈。

### 3. 复用真实战斗，独立拥有临时状态

基于所选入口startWorld经现有buildWorld生成全新world；仅在临时副本授当前技能、提高队长MP供试放（至少沿用999并足够所选MP成本）。
不自动给全技能/金钱/物品、不改其他成本或技能可用条件；其他条件不足由真实战斗反馈，不伪造成功。
选择入口场景仅用于其当前静态战场/音乐配置，不启动场景onEnter、auto、敌对接触或探索逻辑；不依赖落点坐标、也不执行战后剧情和持久奖励回写。
使用既有BattleSession与正式战斗输入/render/资源readiness，选中技能必须能通过真实施法路径作用于实际目标。
允许**最小内部提取**main现有world→CreatePlayerInput构造到`battle/battle-player-input.ts`，正常战斗与试放共用，保持装备/状态/身份/技能组合的既有计算。
资源准备复用既有prepareBattleSpriteReadiness、collectBattleBaseSounds/collectTurnActionSounds、collectBattleSkillFireChunks及公开加载器；
如需共享编排只提取当前必要准备段，不复制伤害/AI/结算算法、不整体拆main、不顺带修Q2。
试放不调用正常world奖励/存档收尾；胜败/逃跑只结束此试放并显示结束状态，不转入普通探索或标题读档。

### 4. 生命周期与资源边界

独立AbortController、rAF/输入/可见性与音频所有权；准备中/战斗中/pagehide/错误/正常结束走同一幂等收尾。
同一页在一个试放仍活动时重复启动应拒绝，不叠加两个session或让后一个复用前一个的cleanup；不同标签页仍各自独立。
取消后await迟到不得构造session/播放新音乐/提交画面；真实session.cancel处理尚在途readiness。音效可dispose，BGM至少stop取消迟到播放，关闭页由浏览器结束宿主。
复用GameplayClock等已有时序约定，不改帧速；BattleSession的Escape语义保持，试放结束操作与正常战斗菜单取消区分。
F5/F9不能读写进度，明确提示临时模式；不把浏览器刷新或正常保存toast冒充试放存储成功。
加载失败给可关闭/重新发起的错误，不保留半活动session，不改正常存档/项目数据。

## 范围与不做

主要面：editor SkillTab/App最小props接线、试放URL/选择helper/弹窗；reforge main早分流、私有skill-trial宿主、必要的battle-player输入提取与测试。
可能的新文件：editor/core/skill-trial-url.ts、editor/ui/SkillTrialDialog.tsx、reforge/skill-trial.ts及同名测试；无需schema/save/content版本升级。
不改GLM包11个目标生产模块或其新增测试；若实现确需触碰，先停该重叠点并回卡调整，不让两席同改。
不改battle-core/formulas/技能效果语义/战斗菜单布局、迁移器/PAL生成内容/保存格式；不实现X5前置世界变量配置、Q1速胜或Q2整组修复。
普通Debug面板授技仍属显式调试编辑；不借本卡改其存储政策，只更正把它误称“不落档”的相关注释，避免混同独立试放。

## 上下文与验收

- [READ-FIRST](../../../../phase2/READ-FIRST.md)、[D-04/D-05审计及用户裁决](../../../audits/pre-e2e/editor-workflows.md)、[已收口存档隔离](SAVE-ISOLATION-1-project-workspace-save-scope.md)、[世界异步提交](../../../../testing/world-async-commit.md)。
- [harvest](../../../../phase2/reference/phase1-knowledge-harvest.md) X7/X8/B仅核现有资源/所有权教训，旧“现状”不当当前事实；本卡不重裁公式/原版怪癖。
- 主/脚本dirty与身份复验参考ShopTab.tsx:178-189；shop-trial.test.ts已有早分流禁止SaveStore的验证模式，需加强为真实新项目/真实BattleSession。

验收必须同时具备：

1. 非PAL项目、非数字ID入口/敌队、单/多选、空缺/悬空/未保存/并发切换；当前SkillTab不再产s001/0固定链接。
2. 合法新项目经正式loader进入真实BattleSession并实际施放选中技能；断言BattleState技能/目标/消耗/效果，不能只看URL、toast或mock构造器次数。
3. 正常项目原始输入/存档预置值深快照不变；试放启动、F5/F9、结束、失败、关闭期间正常SaveStore构造与所有槽IO为0。
   混合URL不得落回正常boot；缺敌队不能走victory桩。normal boot保存/读取与独立试买仍通过。
4. 准备/音效/图像各await的取消、失败、重复收尾、旧回调迟到；会话/监听/rAF不残留，不使用固定sleep代替进入证明。
5. 最小共享玩家输入提取前后真实正常战斗参数完全相同，普通战斗启动/取消/结算回归不下降。
6. Codex最小功能视觉：编辑器保存后打开小弹窗/对应入口→新工程真实战斗选技能→结束；缺条件可见可操作；正常存档未改变。
   剧情全流程与Q2专项不在本卡重复走，新增试放工作流作为R4/编辑器E2E入口登记。
7. 定向/相邻、tc/Biome、必要单点负控，再串行check→ratchet→受保护单次fast。没有视觉证据不得以非视觉测试代验。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-19，e58834f6，以上提出方案）**。本人直读当前SkillTab/main保存/战斗启动、BattleSession生命周期、shop-trial早分流，复跑当前前提探针与45相邻测试。
  独立存储隔离采用“正常boot前独立宿主return”，不选普通scope换名/保存后回滚；复用真实战斗，不复制公式。可证伪边界见上。
  **UI承载形式仍待用户确认**，三席即使签齐也不据此越过UI产品门；本签不是提前实现授权。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部证据本人直读/复跑，未读 GLM 结论）**。
  - **入口缺陷直读**：`SkillTab.tsx:1117-1118` 写死 `&scene=s001&battle=0&skill=` 且 title 自称
    「不改存档/项目数据」；`main.ts:2220-2253` 启动链（launchWorld/launchSignal 校验）与
    `:2473` 真实 `new BattleSession` 构造在位；`:353-360` bootGame 在 assertSaveScopeProject 后、
    普通世界/SaveStore 前经 shop-trial 早分流 return（先例核实）。
  - **本人复跑前提探针**（exit 0）：SSR 链接仍 s001/0、实际场景回退 start、battleResult=victory、
    **sessions=0**（无真实战斗=D-04 桩胜）；同一 world 真实 quickSave→临时授技→quickSave，
    savedAfterMaxMP=999、savedTrialSkill=true（临时状态写入同 scope 内存槽=D-05 污染）、
    authorInputUnchanged=true——两前提动态复现，修复层为入口/隔离而非存档格式或迁移。
  - **设计同意**：编辑器仅配置本次入口（dirty/身份双复核、敌队仅列本工程非空合法、缺条件
    明确提示不桩胜）；URL 仅身份+skill-trial/entry/battle 三参、重复/缺值/未知 ID/混合模式
    副作用前拒绝、ID 原值查表；**普通 boot 前早分流到私有 runSkillTrial 并 return**——不构造
    正常 SaveStore、不预读 metas、不进标题，不是写后回滚（优于换名槽）；试放宿主零存档 IO、
    editor IndexedDB 句柄读取与游戏存档库明确分开；真实 BattleSession+最小 battle-player-input
    提取（前后参数等价须证明）不复制公式、不拆 main、不顺带 Q2；独立 AbortController/rAF/
    音频所有权与幂等收尾、取消迟到不构造 session/播曲/交帧、F5/F9 禁读写并明示临时模式。
    旧 `?skill` 临时授技捷径退役给重新打开提示，不留静默兼容通路（铁律 11 合规）。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 当前正式入口已能从本工程选非空敌队并
    实际构造 session → 前提倒（探针否定）；② 隔离宿主仍构造正常 SaveStore 或任何槽 IO>0 →
    设计 2 违反；③ 试放链不经过真实施法路径（toast/URL/mock 构造计数）→ 验收 2 不满足；
    ④ 混合 URL 落回正常 boot 或缺敌队仍走 victory 桩 → 边界破坏；⑤ `?skill` 捷径仍可静默
    到达 → 兼容残留；⑥ battle-player-input 提取前后正常战斗参数不等价 → 提取越界；
    ⑦ **入口 UI 形态未获用户确认即开工** → 门禁破坏。
  - 返工项：无。**入口 UI 形式（沿用独立试买小弹窗）尚待用户确认；本 design agree 不越过
    UI 产品门，不据此开放 build**（与 Codex/GLM 两席保留条件一致）。
- GLM：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；本席只审数据/存档入口/失败矩阵，未读 Kimi 结论；不做视觉）**。
  - **入口/执行/保存锚点直读**：SkillTab.tsx:1117-1118 确写死 `scene=s001&battle=0&skill=`；
    main.ts:2220-2253 敌队缺席走 victory 桩、:2473 真实 `new BattleSession`、:590 正常 SaveStore 构造、
    :5612/:5817 doSave/quickSave、:355-359 shop-trial 早分流先例、shop-trial.ts:17/38、
    battle/battle-session.ts:341/:636/:644 构造/done-cancel/tick——卡片前提全部一手核实。
  - **前提探针本人复跑**：`node --import tsx docs/testing/skill-trial-premise.mjs` exit0——
    SSR 链接仍 s001/0、实际场景回退 start、battleResult=victory、sessions=0（无真实战斗）；
    同一 world 真实 quickSave 链把临时授技/MP999 写入同 scope 内存槽（savedAfterMaxMP=999、
    trialSkill=true）而作者输入不变——D-04 桩胜与 D-05 存档污染两个前提都动态复现。
  - **design agree（数据/失败矩阵侧）**：普通 boot 之前独立宿主早分流 return（不构造正常 SaveStore/
    不预读 metas/不进标题）优于"保存后回滚"；真实 BattleSession + 最小 battle-player-input 提取
    不复制公式；混合 URL 副作用前拒绝、ID 原值查表不 parseInt；敌队缺失不落 victory 桩。
    失败矩阵（缺入口/队伍/技能/队长、未保存 dirty、悬空 ID、重复启动、取消迟到）与验收 1-5 覆盖
    数据/时序面。**UI 承载形式仍待用户确认——本 design agree 不越过 UI 产品门**。
  - **可证伪观察**：①若当前正式入口已能从本工程选非空敌队并实际构造 session→前提失效；
    ②若隔离宿主仍构造正常 SaveStore/任何槽 IO>0→设计 2 违反；③若试放链不经过真实施法路径
    （只 toast/URL/mock 构造计数）→验收 2 不满足。
  - 返工项：无。
- build准入：**关闭，r2待设计**。三席r1已齐的历史事实保留（Codex原签、GLM 7753f137、Kimi 607b2aa3）；用户当前提出通用战斗模拟器与预设，目标/配置来源/持久化边界改变，原签字不授权新范围。与补测卡独立，不互借签字。

### done前（r1历史，未实施，不作为当前门禁）

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done准入：未开放，不代签。

## 交接日志

- 2026-09-20 Kimi（列宽补丁增量确认）：候选 d394eccc 对比 fe0fee84，签 accept。独立直读
  4 文件：Forms 仅 5 处 className（删 trial-choice-short×4/trial-pool-columns×1，队伍位置入
  公共网格）；CSS 删两个私有类、`.trial-config-columns` auto-fit→auto-fill（保空轨道使单列行
  与多列行同轨等宽）+显式可收缩宽度；既有用例新增 17 标签同轨主断言与删除类缺席断言；
  普查快照仅 auto-fill 一行。无业务回调/公共控件/引擎/基线改动。本席复跑定向 22/22 绿
  （含 CSS 轨道普查锁）；TC/Biome/build 与四尺寸视觉采信 Codex，未重复视觉。未读 GLM 补丁
  结论，不改实现/状态、不标 done。Next：GLM 补丁签齐且用户 UI 验收通过后由 Codex 统一收口。

- 2026-09-20 Kimi（UI-r1 增量审查）：候选 fe0fee84 对比 cb44c378，签 accept。独立证据（结论
  形成于读 GLM 新结论前）：DsAddPickerDialog 公共控件零改、只增 2 条采用登记（5→7 owner、
  6→16 数据路径精确扩容）；Forms 两处 picker 以 revision=useMemo({state,value}) 接线——undo/
  外部变化关弹窗、确认前零命令、onConfirm 复核上限与候选；Workbench 命名方案与 App 快捷入口
  两条路径均有 changed 草稿覆盖确认，replacementScope identity 失效过期确认；CSS 全为业务
  容器类+--ds-space-* 令牌，未改公共控件默认尺寸。本席复跑：UI 10+leave-guard 32 全绿、
  采用门 68 全绿；增量范围仅 editor UI/测试/采用登记/文档/baseline，reforge/content/core/
  play 零 diff；baseline 7400→7404 恰 +4 无缩范围。check7895/ratchet/strict7404/build 与四尺寸
  视觉采信 Codex 已落证据，未重复视觉。旧披露边界（原生选择器/360 主壳/full-Q1-Q2）不阻断。
  未改实现/他席/状态，不标 done。Next：两席同候选 accept 齐后交 Codex 核 done 准入与用户验收。

- 2026-09-20 Kimi（独立终审，落盘期间卡转 rework）：对统一候选 cb44c378（对比 1bae48e4）完成
  代码级终审，签 accept 留作历史技术证据（不含 UI 验收、不授权旧候选 done）。独立证据：
  直读保存链（battle-simulator-library.ts:183-203 缺席/坏文件区分、open-local.ts:88 原样抛、
  project-io.ts:657-660 preflight 早解析、:341-344 非空才落、App.tsx:2217/:2359 双回调接
  removalPaths、clone.ts:88-99 字节携带、author-disk-baseline 缺席记 null）；隔离（play.ts 试打
  分支早分流 return、battle-trial-host.ts 无 SaveStore、F5/F9 拦截、临时 world 经
  battle-trial-prepare.ts:205-215 新建且奖励只写它）；握手（battle-trial-launch.ts check 双
  assertCanLaunch+双 token+revision、重开换 launchId、接收侧五重校验；battle-trial-assets.ts
  :253-260 准备后从 source 重载复核）；资源收尾（快照 slice 进出+seal+三处取消检查、
  abortableTrial 拒迟到、bgm dispose 幂等+两道 disposed 门、宿主 abort 全链清理）；复用
  （battle-player-input/battle-world-result 为 main.ts 内联逐字段提取、空敌队桩胜改 throw）；
  人数（config:25/:116-117 ≤3、prepare:150 敌方≤5）；main.ts:345-347 旧 ?skill 在 SaveStore
  前拒绝、DEV grantSkill(:7007) 保持内存态独立调试。本席复跑：S1 4对照 PASS+4针 detected、
  runtime 6对照 PASS+6针 detected、reforge 定向64项、editor 定向46项全绿；check7891/ratchet/
  strict7400/build 采信 Codex 已落证据。披露边界（原生选择器取消→浏览器保存重开正向未过但有
  S1 真实事务集成、360宽沿既有主壳、full/Q1/Q2未跑）判断不阻断本批代码级收口。
  未读 GLM 结论（本席结论形成于其落盘前），未改实现/他席/状态，不标 done。
  Next：UI 返工归 Codex；新候选出来后再做增量复核。

- 2026-09-20 Codex：用户UI/交互counter，转rework；cb44c378技术证据和GLM已签原文保留，撤回本席当前UI验收。
  按DS-C.4e/DS-L.7修正添加、宽度、间距和焦点；原模型/隔离设计不重签，旧候选不再推进done。

- 2026-09-20 GLM（终审复核）：对统一候选 cb44c378（对比 1bae48e4）完成代码级 V1～V10 独立复核，
  签 accept（证据见 done 前本席）：两组负控复跑 rc=0（S1 4+4、runtime 6+6 全 detected）；
  直读 r2a 三人上限/敌方五槽/strict JSON、八类悬空引用定位拒绝、旧 ?skill 早拒绝与桩胜删除、
  一次性握手五重校验、真实 BattleSession 与临时 world 结算、fixture 过正式 loader、
  player-input 同实参保真；定向抽查 109 项绿；baseline diff 精确扩容零新豁免。
  披露边界（原生选择器取消/360 宽/full 未跑）如实确认，视觉归 Codex。未读 Kimi 结论，
  未改实现/他席/状态，不标 done；不操作浏览器/Mimosa。

- 2026-09-20 Codex：r2/r2a实现候选cb44c378进入review；check7891/ratchet/受保护单次strict7400/build通过。
  用户图标/布局/多选反馈已并入；验证限制与首次门禁失败如实记入实施回执。只签本人accept，Kimi/GLM并行终审提示词已同候选落卡，未标done。
- 2026-09-20 Codex（集成）：300f907f已快进合入main并推送，当前packages/scripts相对cb44c378零diff；
  6010的PAL评审沙盒已实际显示一级“战斗模拟器”及试打方案空态。未写PAL内容，仍待两席终审与用户验收。

- 2026-09-20 Codex（门禁核定）：用户要求只核签字与既有证据。核GLM 1a44c3c6/Kimi 99bd6969及本人r2a签字齐，
  与原r2主体合并恢复已批准范围build；未确认入口UI不因人数签字开放。无实现/测试/基线改动，不标done。
- 2026-09-20 Kimi：r2a 人数勘误独立补核——直读用户原话「我方本来就是1-3人，游戏里不会有
  超过3人的情况」、SDL `reference/sdlpal/palcommon.h:42`（MAX_PLAYERS_IN_PARTY=3，出战上限）与
  `:48`（MAX_PLAYABLE_PLAYER_ROLES=5 为可用角色总数而非出战数）、一阶段 `draw-battle-ui.ts:64-67`
  （信息框 x=91+77×i，i=3 时 322>320 出画布）、Reforge `battle-ui.ts:24-25`（同 91+77）与
  `battle-session.ts:2846`（兜底 x=8+106×i，i=3 时 326）——两阶段 UI 对第四人均无完整显示且无分页；
  `battle-positions.ts:29-36` 站位表虽有 4/5 档但存在≠完整支持；`battle-core.ts:67` MAX_ENEMIES=5、
  `:322-325`、ENEMY_POSITIONS_BY_COUNT 证实敌方五槽为独立真值，不得随我方勘误误缩。结论：人数边界闭合
  ——我方启动 1~3 人、第四人在三处一致拒绝、敌方五槽不动、不留五人扩展任务/兼容格式。签
  premise verified / design agree，附五条可证伪观察（第四人可进试打、敌方槽被缩、1/2/3 人回归失败、
  以站位表翻案、5 人 WIP 合入或留兼容格式——任一成立即 counter）。仅核 r2a 人数边界，保存/隔离/
  四目录未重审，不改实现/他席/状态。

- 2026-09-20 GLM：r2a 定点补核落席——独立直读 SDL 常量、两阶段战斗 UI 源码与敌方五槽
  真值，签 premise verified / design agree（含三人正控/四人拒绝/敌方五槽不误伤回归矩阵与
  可证伪观察）。仅核人数勘误，不重审未变化设计，不改实现/状态。


- 2026-09-20 Codex：用户明确我方原需求就是1～3人。修订r2a人数前提和目标，撤销五人扩展选项及待用户判断，
  我方三人/敌方五槽分开；本人签定点premise verified/design agree，两席只核此勘误，保存/隔离/四目录不重审。

- 2026-09-20 Codex：核正式信息栏/调用方/fallback后发现第4～5位我方超画布，记录四向真值与可证伪条件，
  本卡blocked并等待人数产品裁决。已完成代码保留独立分支WIP，不将类型检查或站位表当正式界面验收；
  不扩张正式引擎UI、不自行把上限改3。GLM九批新回执70503f1a已看到，仍需独立复核，未合并。
- 2026-09-19 Codex：在隔离工作树实现S1配置/保存基础：严格模型、作者事务、缺席基线、重开/删空/另存/克隆/ZIP/恢复，
  补开发HTTP缺失文件404合同。实际App保存回调回归已钉；四正控/四坏实现负控通过，细节与失败记录见实施附件。
  尚未接真实BattleSession或完整UI；不宣称S1全完、整卡done或覆盖率门已过。
- 2026-09-19 Codex：S1配置/作者保存基础已在`codex/editor-battle-simulator-r2`提交推送`641a85fb`，尚未并主线。
  工作树`/Users/zhangxu/.codex/worktrees/battle-simulator-r2/type-pal`；该分支实施回执`docs/testing/battle-simulator-implementation.md`。
  新增67项；原fast测试选择editor225/2397、reforge117/1219绿（只跑测试，非覆盖率门）；两包tc通过，四正控/四负控通过，Biome无error/warn。
  尚缺引用诊断、完整UI、真实战斗及整卡质量门，保持build、Codex继续，不交终审、不标done、不改官方基线。
- 2026-09-19 Codex：用户告知“签了”后同步main，核9aac034c/444cad25为同一r2的前提/设计签字、无counter。
  统一开build，S1配置与持久化起步；隔离实现工作树避免与GLM返工/签字切分支竞态。done仍关闭，不代签终审。
- 2026-09-19 GLM：完成 r2 冻结设计独立前提/数据/失败矩阵审查，签 premise verified + design agree，
  无返工项。独立复跑前提探针 exit 0（sessions=0 桩胜、MP999/临时授技入同 scope 槽、作者输入不变）；
  直读四类配置类型表达力（character/actor/enemy/battle-core/battle-session/battle-positions）、
  装备与物品合法性真源（item.ts 槽位/equipableBy/itemUseSupportsContext）、派生/结算/静音链
  （main.ts:2281-2345、:2550-2637、:2262+:2471）与持久化守卫（FileSource 缺席契约、
  author-disk-baseline null 预期、project-io 事务/身份域/路径冲突、loader 不枚举、
  export-zip/fsa-copy 携带）。V1～V10 鉴别力核对，九条可证伪观察与四条非阻断备注写入本席。
  未读 Kimi 结论；未改产品/测试/基线/他席内容/任务状态；不做视觉。Next：Codex 核定 build 准入；
  dev-functional 视觉归 Codex；本席九批返工任务不受本卡影响。
- 2026-09-19 Kimi：完成 r2 冻结设计独立前提/架构审查，签 premise verified + design agree，无返工项。
  直读 author-disk-baseline/project-io/workspace-context/open-local/export-zip 附属配置事务接入点、
  character instantiate 与正式派生（main.ts:2280+ 建态 live 派生）、battle-core/session 初始化时序
  （构造即 stepBattle，事后塞状态不成立）；复跑原前提探针 exit 0（桩胜+污染仍复现）。
  握手不回落普通 boot、正常存档零 IO、敌方首批满血边界与人数/资源换代范围均核实；
  九条可证伪观察写入本席。未改产品/他席/状态，未读 GLM 结论。Next：GLM 并行签字后
  Codex 核定 build；dev-functional 视觉归 Codex。
- 2026-09-19 Codex：用户答复“好的”，明确两项保存约定；冻结r2首批S1～S4和附件V1～V10，
  本人签premise verified/design agree。核对生产相对e58834f6仍零diff，旧r1不重写。同步发两席独立设计提示词，
  直接落本人签字和日志，视觉仍由Codex承担；当前未开build、不标done、不暂停GLM既有返工。
- 2026-09-19 Codex：用户确认草图是内容不完整的示意图，并认可大方向。记录四目录布局/流程方向通过，
  明确本场调整不限技能；不将此扩大解释为逐字段验收、两项保存政策批准或r2三签豁免。仅更新文档，产品零改。
- 2026-09-19 Codex：用户要求GLM返工同时推进战斗模拟器；同步main至216cf3bb、工作树干净，
  独立核实作者保存/身份保留路径/HTTP缺席合同/角色与敌槽输入。新增r2实施草案与可点击四目录草图，
  未触生产核、GLM候选、测试或基线。持久化推荐`editor/battle-simulator.json`，不写受保护`.type-pal`。
  尚待UI与两项保存选择，r2三席未签，保持rework；无新的Reviewer交接要求，不让GLM停止既有返工。
- 2026-09-19 Codex：用户连续补充共享战斗模拟器方向（我方配置、敌方成员、战场、预存我方配置，以及战斗道具使用/投掷），并指出开局选择意义不大。已停止r1方案并转rework，上方记录新方向、当前入口/模型一手证据及待决边界；不再重复询问旧小弹窗选项。仅改文档，不改产品/版本/覆盖率，未借旧签字扩范围实施。
- 2026-09-19 Codex：用户告知“签了”后同步并核三席r1均premise verified/design agree、无counter，生产核对零漂移。
  入口UI仍无明确答复，已单独询问是否沿用独立试买小弹窗（技能只读、入口/敌队选择、开始试放），不把预选或设计签字当UI裁决；尚未改产品。GLM补测准入独立，不因本项等待而暂停。
- 2026-09-19 Kimi：完成 r1 独立设计/架构审查，签 premise verified + design agree，无返工项。
  直读 SkillTab 写死链接与自称、main 启动链/真实 BattleSession 构造、bootGame shop-trial
  早分流先例；复跑前提探针（sessions=0 桩胜、临时授技写入同 scope 槽污染、作者输入不变）
  ——D-04/D-05 动态复现。七条可证伪观察写入本席；**入口 UI 形式尚待用户确认，本签字不
  越过 UI 产品门、不据此开放 build**。未改产品/他席/状态，未读 GLM 结论。
  Next：UI 形态确认后 Codex 核定 build 并实施；dev-functional 视觉归 Codex。
- 2026-09-19 GLM：完成设计/矩阵审查，签 premise verified + design agree，无返工项。直读
  SkillTab/main 保存与战斗启动锚点；独立复跑前提探针（两缺陷动态复现）。UI 产品门保留待用户。
  未读 Kimi 结论；未改任何实现。Next：三席齐且 UI 形式确认后 Codex 核定 build 并实施。

- 2026-09-19 Codex：用户授权独立临时方案后，同步准备试放修复与GLM大批补测。前提探针已在当前API上复现两问题，初版fixture修正如实登记。
  当前只建draft/落方案，生产/正式测试/基线零改；使用Vitest/pnpm复跑45相邻项，并以Vite SSR只读核当前链接。UI形式问题已异步提出，不把未答当同意。

## 历史设计交接提示词（不再执行）

以下是设计期交接历史；r2a定点补核已完成。当前实现终审使用卡顶部cb44c378两席并行提示词，不重签设计。
以下提示词仅留历史，不再执行；本轮仅核定阶段门禁，不以此触发实现或宣称功能完成。

### 历史r2a定点补核：已完成

```text
在 /Users/zhangxu/illegal/type-pal 定点补核 EDITOR-SKILL-TRIAL-1 r2a，卡 docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md，rework。
先同步并读AGENTS/CLAUDE/READ-FIRST、本卡r2a和 docs/testing/battle-simulator-r2-design.md。
用户已明确我方本来只有1～3人，敌方仍五槽；这不是新增需求或以后做五人的承诺，不再问用户。
独立读SDL palcommon.h:42/48（出战3与总角色5）、game draw-battle-ui:64/405、Reforge battle-ui:24/157和battle-session:2820/2846。
只核人数勘误：配置草稿可空、启动1～3人、第四人守卫拒绝、UI/快速入口/宿主统一；不改正式战斗HUD，不保五人兼容。
Kimi审跨入口一致性，GLM审三人正控/四人拒绝/敌方五槽不误伤矩阵；各自在r2a本人席位签独立premise verified/design agree或counter并提交推送，不读或复述另一席结论。
保存/隔离/四目录等未变化部分不重开，WIP83ade2ef只作参考非验收候选。不得改实现、另一席签字或任务状态，不标build/done。两席落卡后由Codex恢复实现。
```

下列r2设计提示词仅留历史，不可用来越过r2a准入。

以下两份可并行转发，均钉 **r2 / 2026-09-19保存裁决后冻结** 与生产 **e58834f6389a40ffe9f187e6a8051f552e964d79**。
只审新范围；已批准的保存方式/界面方向不重问，r1签字保留历史；当前不得开始实现或标记done。

### 给Kimi

在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-SKILL-TRIAL-1 的r2冻结设计，状态rework。
先同步分支、核工作树，再读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md 的r2区及
docs/testing/battle-simulator-r2-design.md；全域评估仅作背景。
同一候选：r2 / 2026-09-19保存裁决后冻结，生产e58834f6389a40ffe9f187e6a8051f552e964d79。
用户已确认四目录草图大方向、预设随工程保存、首版先保存工程再试打；临时调整不必另存，战斗结果不落盘。
独立直读入口/保存/战斗一手链，必要时复跑 node --import tsx docs/testing/skill-trial-premise.mjs。
重点压力测试：编辑器附属文件的版本/基线/准备写集/恢复/另存闭环、共享派生与隔离结算、
一次性内存握手的身份与取消所有权、普通boot前分流且SaveStore零IO、首批与高级敌方初始化分界。
核1～5人支持不能只拿站位表作证、资源惰性读取与工程换代边界、缺条件不得桩胜；不另改战斗公式。
在本卡r2 Kimi席位分别签带直接证据的premise verified和design agree，或写file:line/可证伪反例counter。
不读取/复述GLM结论；只改本人签字/交接日志并提交推送，提交前同步并保留他席修改；不改状态/他席，
不得改产品/正式测试/基线，不得开始实现或标记done；功能视觉归Codex，不要求重复看草图或替代用户验收。

### 给GLM

在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-SKILL-TRIAL-1 的r2冻结设计，状态rework。
先同步分支、核工作树，再读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md 的r2区及
docs/testing/battle-simulator-r2-design.md；全域评估仅作背景。
同一候选：r2 / 2026-09-19保存裁决后冻结，生产e58834f6389a40ffe9f187e6a8051f552e964d79。
用户已确认四目录草图大方向、预设随工程保存、首版先保存工程再试打；临时调整不必另存，战斗结果不落盘。
独立直读真实类型/守卫/保存/运行入口，可复跑 node --import tsx docs/testing/skill-trial-premise.mjs。
重点核四类配置的引用/继承/覆写/零值/空槽/静音、合法装备和物品用途、等级与属性不能混同；
附属文件真正缺席与坏文件区分、基线/事务/恢复/另存/ZIP与悬空引用策略；V1～V10是否能用合法fixture及
真实调用链形成有鉴别力的业务断言，取消用entered/deferred，不靠固定超时或只测URL。
在本卡r2 GLM席位分别签带直接证据的premise verified和design agree，或写file:line/可证伪反例counter。
不读取/复述Kimi结论；只改本人签字/交接日志并提交推送，提交前同步并保留他席修改；不改状态/他席，
不得改产品/正式测试/基线，不得开始实现或标记done；不做浏览器/截图/视觉验证，不使用Mimosa作为本卡门禁。
本次是设计审查，不替换或暂停九批测试返工任务。

### r1历史交接（不再使用）

与[并行补测卡交接区](../../../tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md#下一位agent提示词)同发两份完整提示词。
Kimi/GLM独立审本卡r1与冻结e58834f6，各自直接写本人签字/证据/日志并提交推送，不代签、不改状态、不标build/done。
GLM本卡只审设计/矩阵，不修改试放实现；三签齐前Codex不得开始产品实现，UI产品门独立保留。
