# GLM Wave M：编辑器数据页、资源库与设计控件补测

入口：[任务卡](../../../ops/tasks/TEST-GLM-WAVE-M-1-editor-data-assets.md)（只读）；
[冻结表与共同协议](../README.md)；[只读冻结核对](../verify-targets.mjs)（62 源、A–K 历史零交集）。

生产冻结 `f70db72236d9cac794d40a625a89fef8c29459ae`；分支 `codex/glm-wave-m-editor-data-r1`
（自派发提交 `784fb098789a64b21c45e6c942d87abfa9efac2f` 建独立工作树）。
只写 `*.glm-m.test.ts(x)` 新文件、专属 fixture `packages/editor/src/__tests__/glm-m/kit.ts`
与本目录证据；产品、旧测、L/N 文件、真实项目资产、共享配置与官方基线零改动。
当前为 **r2 返工候选**（响应 Codex 对 0b045c15 的独立审核，见文末「r2 返工记录」）。

## 结果总览

- 新测试：12 个文件、**31 例全绿**（[vitest-directed.json](vitest-directed.json)，file × fullName × status）。
- Editor 全包：**493 文件 / 3684 测试全绿**（最终树口径，见下方质量门）；typecheck 干净。
- 业务反控：**4/4 有效**（合法输入单轴变异 + 波 K 同款单一可执行判据 + self-test 8/8），
  [counter-control/evidence.json](counter-control/evidence.json)。
- 功能视觉：**2 条**真实浏览器操作（视口 1440×900、截图 SHA256、console 全程零错误），
  [visual/](visual/)。
- 根 `pnpm lint`：**2777 文件 0 error / 0 warning / 0 info**；`node scripts/docs/check.mjs` PASS；
  `git diff --check` 干净。

## 逐组排重账（现行 caller → 旧证据 → 结论）

结论只分四类：`new-contract`（本波新证）/ `existing-proof`（旧测已证，不重复）/
`unreachable`（无现行 caller）/ `blocked`（停组待 Codex）。

### M01 技能/成长/战场（SkillTab / LevelCurveEditor / BattleFieldTab）

| 源 | 旧证据（fullName 锚） | 结论 |
|---|---|---|
| SkillTab.tsx | SkillTab.test.tsx 18 例（目录/深链/成本/动画/reorder/引用门/live oracle）；glm-ui-wave 5 例（删除取消/效果增改/gate/目标/玩家分支）；kimi-workflows 4 例（引用在途/新建/删除回退） | 剩余缺口 → new-contract |
| SkillTab.glm-m.test.tsx | — | **4 例**：applyPoison poisonId 提交并产生 skill-poison 引用（undo 引用消失）、removeStatus 多选数组逐步、buffStat 持续 battle↔turns+N 回合、moneyDamage 四字段逐轴（MoneyDamage 分支此前零 UI 断言） |
| LevelCurveEditor.tsx | LevelCurveEditor.test.ts 3 纯函数 + ui.test 1 + kimi-workflows 5 例（拖点/边界/滚轮/级数/按增量生成） | existing-proof（提交/取消/undo/redo 轴全被证；无资源/引用轴） |
| BattleFieldTab.tsx | BattleFieldTab.test.tsx 10 例（目录/搜索/首建/引用/fail-closed/live oracle）；glm-leaf-wave 3 例（background pick/clear、五灵逐键、名称清空删键） | 剩余缺口 → new-contract |
| BattleFieldTab.glm-m.test.tsx | — | **4 例**：复制战场单命令+undo 精确（nextBattleFieldId=max+1 语义）、创建表单取消零提交+非法编号 notice、常驻波动强度 blur 单命令+兄弟保全、预览资源失败面（palette 读取失败可继续编辑；无背景黑底空态） |

### M02 道具/使用效果/炼化/商店（ItemTab / ItemUseEffectEditor / ItemAlchemyTab / ShopTab）

| 源 | 旧证据 | 结论 |
|---|---|---|
| ItemTab.tsx | ItemTab.test.tsx 24 例 + kimi-workflows 4 例（目录/新建/复制/删除门/私有脚本/能力开关/图标/投掷演出/炼化摘要） | 剩余缺口 → new-contract |
| ItemTab.glm-m.test.tsx | — | **2 例**：买价/卖价/商店可收购三轴逐命令+undo 链+无关物品保全（grep 全旧测无价格断言）、介绍多行拆分（空行丢弃、原文保留）+undo |
| ItemUseEffectEditor.tsx | ItemUseEffectEditor.test.tsx 12 例 + glm-ui-wave 4 例 + kimi-workflows 5 例（结构化默认/链操作/独占钩子/脚本选择/解毒施毒/投掷字段族） | 剩余缺口 → new-contract |
| ItemUseEffectEditor.glm-m.test.tsx | — | **2 例**：永久成长（改类默认 maxHP+5→属性/增量逐轴）、明雷感知（rangeMultiplier 0↔3、持续毫秒）——两分支此前零真实会话断言 |
| ItemAlchemyTab.tsx | ItemAlchemyTab.test.tsx 12 例 + glm-leaf-wave 5 例 + DataMode.item-alchemy 1 例（双 surface/行级/禁删/reorder/fail-loud） | 剩余缺口 → new-contract |
| ItemAlchemyTab.glm-m.test.tsx | — | **2 例**：工作台「添加对应关系」按钮→真实会话追加缺省配方（旧只证纯函数）、紫金葫芦「不可用提示」提交与清空删键 |
| ShopTab.tsx | ShopTab.test.tsx 10 例（lifecycle copy/delete/cancel、试买、上架、234 项虚拟、切店清草稿、reorder）+ glm-leaf-wave 2 例 | 剩余缺口 → new-contract |
| ShopTab.glm-m.test.tsx | — | **2 例**：「新建店铺」按钮从空目录创建（AddShopCommand 旧仅作 setup 直接 dispatch，UI 按钮从未被驱动）+ 选中/焦点回调/undo；摘要检查器「引用编号」「在售物品 N 种」readout |

### M03 敌人/伤亡（EnemyTab / enemy-defeated-events / EnemyTeamTab / CasualtyEditor）

| 源 | 旧证据 | 结论 |
|---|---|---|
| EnemyTab.tsx | EnemyTab.test.tsx 14 例 + glm-ui-wave 4 例 + kimi-workflows 6 例（新建守卫/删除全链/AI 行编辑/变身召唤引用/音效/奖励） | 剩余缺口 → new-contract |
| EnemyTab.glm-m.test.tsx | — | **2 例**：召唤数量 1→3 落账（「召唤数量」输入旧从未驱动）、分裂动作 divide+分裂数量 copies（分裂轴全旧测零断言） |
| enemy-defeated-events.ts | enemy-defeated-events 四文件 26 例（解释/摘要/编辑边界/giveItem 改写/概率分支） | existing-proof（提交/取消/引用轴全覆盖；无资源轴） |
| EnemyTeamTab.tsx | EnemyTeamTab.test.tsx 10 例 + kimi-workflows 6 例（槽位/上下移/新建/删除全链/战后汇总/搜索） | existing-proof |
| CasualtyEditor.tsx | CasualtyEditor.test.tsx 10 例 + glm-leaf-wave 3 例（槽位渲染/选中/台词/移除槽/概率 blur/occurrence/reorder） | 剩余缺口 → new-contract |
| CasualtyEditor.glm-m.test.tsx | — | **2 例**：效果链「＋效果」默认 heal→恢复对象→改类 tempStatBuff（伤亡效果轴旧全零断言）、提升比例 blur+下钳 1、台词样式 narration 切换+locale 预览 |

### M04 毒/变量/引用索引（PoisonTab / VarsTab / item-references / battle-data-references）

| 源 | 旧证据 | 结论 |
|---|---|---|
| PoisonTab.tsx | PoisonTab.test.tsx 12 例 + glm-leaf-wave 3 例（目录/新建/可解度/染色/删除门/live oracle） | 剩余缺口 → new-contract |
| PoisonTab.glm-m.test.tsx | — | **3 例**：玩家 tick 四轴（扣血/半血/产道具/自解逐字段+undo 链）、敌人序列独立、致死配对/所克之毒写关系键并产生 poison-counter 引用（grep 全旧测「扣血/半血/产道具/自解/致死配对/所克之毒」零命中） |
| VarsTab.tsx | VarsTab.test.tsx 7 例 + glm-leaf-wave 3 例（新建/重名守卫/flag initial/number initial/元数据命令/删除门/深链回退） | existing-proof（「新开局时开启」即 flag initial，已被 'flag initial toggles' 证） |
| item-references.ts | item-references.test.ts 7 例 + cursor-boundaries + glm-leaf-wave 2 例（canonical 页切换/全页覆盖/删除守卫/天书 locator） | 剩余缺口 → new-contract |
| item-references.glm-m.test.ts | — | **4 例**：collectLegacyItemReferences scriptChunks 分片扫描（reward/lose/read+locator+标签回退/library 命中）、includeLegacyScripts=false 开关、collectCanonicalItemTransitionTaggedReferences 状态机转移物品边（then/else 嵌套路径+终止节点零边）——两入口旧全零 |
| battle-data-references.ts | battle-data-references.test.ts 4 例 + wave2 2 例 + cursor-boundaries 1 例（skill/enemy/poison 引用族） | existing-proof（本波 PoisonTab/SkillTab 新测消费其 poison-counter/skill-poison 出口作联动断言，不改 oracle） |

### M05 战斗精灵库/内联预览/资源查看器（BattleSpriteLibrary / BattleSpriteInlinePreview / SpriteResourceViewer）

| 源 | 旧证据 | 结论 |
|---|---|---|
| BattleSpriteLibrary.tsx | BattleSpriteLibrary.test.tsx 15 例 + glm-ui-wave 2 例 + kimi-workflows 6 例（导入/用途/帧替换/阶段槽/改名/删除/ABI 确认） | 剩余缺口 → new-contract |
| BattleSpriteLibrary.glm-m.test.tsx | — | **2 例**：敌人 profile 计时草稿域——待机毫秒/帧 40ms 换算入 draft（canonical 不动），「应用修改」单命令提交+undo/redo，「放弃修改」零提交；行动毫秒/帧独立（grep「待机毫秒/行动毫秒/攻击/施法特效基帧」全旧测零命中；播种走真实量化编码+AddBattleSpriteCommand） |
| BattleSpriteInlinePreview.tsx | BattleSpriteInlinePreview.test.tsx 2 例 + kimi-workflows 3 例（布局/紧凑预览/迟到解码/fail-loud/拒绝分支） | existing-proof |
| SpriteResourceViewer.tsx | SpriteResourceViewer.test.tsx 4 例 + kimi-workflows 5 例（解码/快速切换/失败保全/追加帧/替换/删除/迟到读取） | existing-proof |

### M06 工程资源工作台/音图（ProjectWorkbenchTab / AudioAssetWorkbench / ImageTab / audio-preview）

| 源 | 旧证据 | 结论 |
|---|---|---|
| ProjectWorkbenchTab.tsx | ProjectWorkbenchTab.test.tsx 30+ 例 + kimi-workflows 9 例（入口/队伍/金钱/种子 HP/开局弹窗好状态/世界资源/诊断/改名） | 剩余缺口 → new-contract |
| ProjectWorkbenchTab.glm-m.test.tsx | — | **2 例**：开局状态弹窗「带入下一场战斗的临时毒抗」勾选→「加值」→保存写 seedConditions.poisonResistance（单输出/重开回显/摘要「临时毒抗 +N」/取消勾选键消失；grep「临时毒抗」全旧测零命中）。挂载导出的 StartWorldFields（ConnectedEditorPages 同一 props 面），不挂 2528 行全 Tab |
| AudioAssetWorkbench.tsx | AudioAssetWorkbench.test.tsx 3 例 + glm-ui-wave 3 例 + kimi-workflows 8 例（导入/替换/删除全链/播放协议/失败保全） | existing-proof |
| ImageTab.tsx | ImageTab.test.tsx 4 例 + glm-ui-wave 3 例 + kimi-workflows 10 例（导入/替换/删除/评审链/预览守卫/生命周期） | existing-proof |
| audio-preview.ts | audio-preview.test.ts 7 例 + audio-preview-session.test.ts 1 例（峰值/缓存/transport/所有权） | existing-proof |

### M07 重排/选择/导航/虚拟列表（reorder / select / navigation / virtual-list / ModuleNav）

| 源 | 旧证据 | 结论 |
|---|---|---|
| design-system/reorder.tsx | reorder.test.tsx 21 例 + glm-leaf-wave 10 例 + 两份 adoption 门（键盘拾取移动/取消零命令/失焦卸载/阈值/no-op/token） | existing-proof（键盘与鼠标状态/排序稳定/卸载清理三轴全被证） |
| design-system/select.tsx | select.test.tsx 1 例 + glm-leaf-wave 5 例（键盘开启/跳过禁用/Enter 提交/Escape 还焦点/搜索/闭触 typeahead） | existing-proof |
| design-system/navigation.tsx | navigation.glm-leaf-wave 6 例（DsMenuBar 箭头/分区/复选/href/禁用/DsToolbar/字符搜索） | existing-proof |
| design-system/virtual-list.tsx | virtual-list.test.tsx 11 例 + glm-leaf-wave 6 例（roving/滚动钳制/active descendant/IME/hover/click） | existing-proof |
| ModuleNav.tsx | `grep -rn ModuleNav packages/editor/src` 全仓仅自身文件，无任何调用方（App.tsx 走 editorModule 数据函数） | **unreachable**：无现行 caller，无合法入口可测；按卡规则登记不新增。若为死代码应由 Codex 另卡清理（本波不越界改产品） |

## 业务反控（4/4 有效）

[run-counter-controls.mjs](counter-control/run-counter-controls.mjs)（判据与波 K 4ebea2b5 同构：
正控 exit0；反控 exit1+执行非零+恰一个指定 fullName 红+红断言来自注入副本绝对路径+无 skip/
timeout/收集错；临时副本用后即删，源文件零写入；FAIL 非零退出；`--self-test` 8/8 反例）。

| id | 组 | 合法输入单轴变异 | 红 fullName |
|---|---|---|---|
| CC-M01-battlefield-screenwave | M01 | 强度 3→4 | 常驻波动强度 blur 一次提交精确值… |
| CC-M02-item-desc-linebreak | M02 | 介绍第二行「第二行」→「第X行」 | 介绍按换行拆分并剥离空行… |
| CC-M04-poison-tick-hpdelta | M04 | 毒 tick 扣血 -25→-52 | 玩家 tick 四轴… |
| CC-M06-poison-resistance-bonus | M06 | 临时毒抗加值 3→5 | 勾选毒抗→加值 3 保存进 seedConditions… |

新鲜结果见 [counter-control/evidence.json](counter-control/evidence.json)。

## 功能视觉（2 条真实浏览器操作）

环境：`VITE_PROJECT_ID=pal pnpm --filter @type-pal/editor dev`（wave-M 工作树，http://localhost:6010），
ZCode 内置浏览器，视口 **1440×900**，`window.__waveMErrors` + console.error 钩子全程收集。
操作后经 `git status`/mtime 核对：真实工程零磁盘写入（仅内存态 + 撤销）。

**V1 数据记录编辑/撤销（BattleFieldTab）**：`?module=battle&page=battlefield` → 战场 #006 →
名称输入 fill「glm-m 视觉战场」→ focusout 提交 → hero/目录/引用面板同步显示新名 →
点击工具栏「撤销」→ hero 恢复「战场 #006」、撤销按钮回到 disabled。
截图：[v1-battlefield-before.png](visual/v1-battlefield-before.png)（sha256 `3d2d146a…`）/
[v1-battlefield-after-edit.png](visual/v1-battlefield-after-edit.png)（sha256 见下表）/
[v1-battlefield-after-undo.png](visual/v1-battlefield-after-undo.png)（sha256 `5721cca5…`）。
console 错误：0。

**V2 资源键盘选择（ImageTab 资源库目录行）**：资源菜单 → 图像 → 鼠标点击立绘 002（建立起点）
→ 键盘 **Tab** 把焦点移到 003 行 → 键盘 **Space** 激活（Enter 在该行被应用键表消费，Space 才
是激活键——如实记录 before→after，不预批产品修改）→ 目录高亮/大图预览/检查器三处联动到
「PAL 立绘 003」。截图：[v2-image-before.png](visual/v2-image-before.png)（sha256 `b43e9311…`）/
[v2-image-after-keyboard-select.png](visual/v2-image-after-keyboard-select.png)（sha256 `0ac75bc9…`）。
console 错误：0。

| 文件 | SHA256 |
|---|---|
| v1-battlefield-before.png | `3d2d146ad1803e828a69e9eaf9d6e747325e26874cd8de42183fe8f3363d2e69` |
| v1-battlefield-after-edit.png | `8707adf24c57a4500956216c86f9a6073f605109b1a7b6c457159705b972860d` |
| v1-battlefield-after-undo.png | `5721cca5ec252f6af316514bc1528de62355c2cea7b58b4c2e308a5e9db9b8dd` |
| v2-image-before.png | `b43e931141018a4fc01d7c595edfbdac5877f02082298dcd4cb8a86383da43d7` |
| v2-image-after-keyboard-select.png | `0ac75bc9d59eda5924f13323eeae2aa204bb6dd451e40049cefd36cc2ba79990` |

## 质量门（最终树口径）

- `pnpm --filter @type-pal/editor typecheck`：0 诊断。
- `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`：493 文件 / 3684 测试全绿。
- 根 `pnpm lint`：2777 文件 **0 error / 0 warning / 0 info**。
- `node scripts/docs/check.mjs`：PASS（795 Markdown / 4163 links / 0 issues）。
- `git diff --check`：干净。
- 定向 JSON：[vitest-directed.json](vitest-directed.json)（31/31）。

## 未证项与停组登记

- ModuleNav.tsx unreachable（无 caller）；死代码清理请 Codex 另卡。
- 本地 fast 的 1301 未命中臂未作为收益依据：官方逐文件报告不在仓库，本波以旧测
  fullName 排重为准；隔离覆盖跑批因 design-system adoption 门负载敏感（并发下 30s 超时）
  未产出报告，串行复跑 65/65 绿，不影响测试结论。
- 本波未发现 schema/生成内容/产品缺陷，无停组项；V2 发现的「目录行 Enter 不激活、Space 激活」
  是观察记录（旧证 select.glm-leaf-wave 'commit by Enter' 针对 DsSelect 弹层而非目录行按钮），
  是否改交互交 Codex/用户裁决。

## 交付

分支 `codex/glm-wave-m-editor-data-r1`，候选 SHA 见任务卡推进记录与提交推送回执；
不合 main、不标 done，待 Codex 独立验收与正式覆盖结算。

## r2 返工记录（2026-09-30，响应 Codex 对 0b045c15 的 counter）

逐项对应任务卡「Codex 独立审核」：

1. **vitest-directed.json 格式诊断**：定向重跑后重新生成，并经 Biome 格式化
   （`biome check --write`，复验 0 诊断、JSON 可解析、31/31）。
2. **去除全部 `as never` / `as unknown as`**（`grep -rn "as never|as unknown as" src/**/*glm-m*`
   = 0 命中）：
   - `item-references.glm-m.test.ts`：chunk/命令/条件全部按 content 当前 schema typed
     （`Command[]`、`ScriptChunkV1`、`ScriptIndexV1`、`AuthorCondition`、`AuthorStateTransition`）；
     「排除开关」用例改以真实 blank 项目（loader→toEditorState）为底座 spread `scriptChunks`。
   - `BattleFieldTab.glm-m`：删除合成 state（原 `as unknown as EditorState`），改为真实 blank
     项目 + `battleFields` spread；`assetBase`/`assetReader` 传真实 `AssetBase` 与
     `createEditorAssetReader`。「预览资源失败」改走真实可达的资源缺失路径：背景指向
     catalog 中不存在的 AssetId（合法作者输入）→ `背景加载失败` 错误面 + 字段仍可编辑 +
     无背景黑底空态，业务合同与 r1 等价。
   - `SkillTab.glm-m` / `ItemTab.glm-m` / `EnemyTab.glm-m`：`assetReader`/`assetBase` 全部
     换成真实公开边界（`loadLegalProject().assetBase` + `createEditorAssetReader(source)`）。
   - `CasualtyEditor.glm-m`：删除合成 state，改真实项目占位主角 + `withCasualty` spread
     （`currentHero` 运行时校验收窄，无类型断言）；locale 以合法条目补 `dlg.talk.0`。
   - 全部 31 例重跑绿；typecheck 0 诊断。
3. **反控判据拒绝非业务断言红**：judge 新增 `redIsBusinessAssertion`——恰红断言的
   failureMessages 必须含 `AssertionError` 且不含 `TypeError/ReferenceError/SyntaxError/
   RangeError/EvalError/URIError`；self-test 扩到 **10/10**（新增 TypeError 红与
   AssertionError+TypeError 混合红两个反例）。四枚反控按新判据重跑 **4/4 valid**，
   新鲜结果见 [counter-control/evidence.json](counter-control/evidence.json)。
4. **质量门复跑（最终树口径）**：Editor 全包、typecheck、根 `pnpm lint`、docs、
   `git diff --check 784fb098...HEAD` 结果见下方质量门节（如实记录）。
5. **共享 `docs/testing/glm-next-triple/README.md` 缺 wave-M 导航行**：文件在本卡白名单外，
   按 Codex 裁定留集成时补行；docs check 结果如实报告，不越界修改。

## 质量门（r2 最终树口径）

- `pnpm --filter @type-pal/editor typecheck`：0 诊断。
- `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`：493 文件 / 3684 测试全绿。
- 根 `pnpm lint`：**2778 文件 0 error / 0 warning / 0 info**（含 wave-M/vitest-directed.json）。
- `node scripts/docs/check.mjs`：**FAIL (1 issue)**——
  `docs/testing/glm-next-triple/README.md:1 子目录未进入导航：wave-M`。该共享文件在本卡
  白名单外，按 Codex 审核裁定由集成时补行，本波不越界修改；此项与 r1 审核所见一致。
- `git diff --check 784fb098...HEAD`：干净。
- 定向 JSON：[vitest-directed.json](vitest-directed.json)（31/31，Biome 格式化）。
