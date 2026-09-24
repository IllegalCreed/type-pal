# ARCH-REFORGE-SCENE-1 — A3-b 场景资源所有权与预检

Status: done
Phase: phase2
Capability: 架构治理A3-b（不改变能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（用户豁免两席，实施者自审）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Unavailable Agents: Kimi / GLM（架构实施签字用户豁免；GLM独立做其它准备包）
Branch: main

Revision: r1
Evidence base: cb1cb26d

## 目标与范围

把场景定义/地图/调色板/生命周期引用的缓存交给SceneResources，把冻结输入、准备资产/页动作/落点/
入口及依赖复核交给ScenePreparer；main继续拥有活动场景与**同步commit**。
这是A3-b，不把剩余场景活动态/移动协调/绘制组装算作已治理。

- 范围内：两个包内模块、main的窄端口/查询接线、直接回归和既有AST调用链接线适配、验证文档/基线。
- 不改：SAVE8/content20、资产格式/底层解码/正式loader、移动/碰撞/渲染算法、
  loadScene/restorePayload的提交与取消顺序；不修demo旧地图或s135默认落点，不改GLM白名单。
- 不顺手更改缓存政策：成功后才缓存的单scene/map不合并在途请求，失败可再试；palette与全scene引用Promise
  沿用现有memo（包括拒绝）；LRU容量16及同key/完成顺序保持。优化/错误政策需另有证据，不凭抽取名义改变。

## 前提真值门

一句话：cb1cb26d主壳既持有四类缓存，也执行只读准备；可以在保留同步提交的前提下迁移这两组所有权。

| 维度 | 一手事实与证据 |
|---|---|
| primary source | `packages/reforge/src/main.ts:355–401`四缓存与查询；`:908–1046`冻结输入/准备/依赖断言；`:1050–1120`同步提交与请求有效性 |
| 第一阶段 | 仅继承缓存/异步工程知识，不复制其逻辑或改UX；`docs/phase2/reference/phase1-knowledge-harvest.md:73–95`（切场/缓存/同步采样教训） |
| 当前二阶段 | prepare在首次await前clone world、显式script与override.def；共享不可变资源可预热，sprite工作集prune仅在commit；`main.ts:933–953/989–994/1055` |
| 目标 | 相同读取/返回/错误/缓存行为，getters不增加await；旧commitSceneSwitch与restorePayload同步段保持；`scene-switch-transaction.ts:18–124`依赖与事务算法零改 |

最强替代解释：主壳只是必要装配，抽取会变成万能Context或新增异步缝。若新模块拿完整world宿主/renderer/DOM、
提前提交活场景、把采样挪过await、返回计划前漏掉任何原依赖，则本候选不成立。
没有大规模数据mismatch，不选择迁移层、不重解释原版行为。用户可见before→after不变；需要新政策时另行裁决。

## 设计与同步边界

1. SceneResources私有map/scene缓存与两个memo Promise；入口scene原引用预置；只提供peek/query，main不再set/delete。
   后端四个读取端口绑定当前工程，模块不需要完整LoadedProject，不引入公共包出口。
2. ScenePreparer使用角色静态表、资源读取/requireSprite/prepareSounds/createRenderer端口及override读取器。
   prepare第一个语句阶段同步冻结world/script/override.def，之后才读取scene；不新增prepare前的await。
3. 资源阶段保持map/palette/sprites/sounds同一Promise.all与原错误传播；只准备，不prune/切换世界；
   页动作、onEnter entry与spawn从同一冻结输入得到。createRenderer保留原读取ctx时点。
4. 主壳prepare/assert包装直接return/调用，不加async/await；loadScene、switchScene、restorePayload仍在
   同一原continuation完成owner断言、beforeCommit/停止旧运行器、world/scene同步提交。
5. 旧cache“protect当前”的真实含义是本次完成加载的map key，并不据此声称pin活动场景。
   保留已有行为，不能把注释或一阶段另一个缓存的policy当新授权。

## 验证

- 先保留实际链回归：scene-preflight、save/restore-preflight、save-lineage、main.scene/save/boot等。
  AST仅适配实际新类/构造接线，不改既有断言或原探针。
- 成组新测试：入口命中、project隔离、scene/map成功/失败/并发完成顺序、LRU触碰/17项逐出、
  palette/引用memo与全scene回填；真实合法project/map/sprite fixture通过正式loader。
- 预检：显式script/override/world深快照、实际读入数据不污染、资产失败不提交、
  页动作/落点/入口、依赖漂移拒绝/无关变化允许、资源预热与prune分离。
- 负控钉住冻结时点、依赖门、缓存触碰/隔离、main接线与提交前guard；不把超时/环境错当业务红。
- 自审完成后整段check→ratchet→受保护单次strict；不逐用例跑全仓覆盖率、不缩范围。
- 功能最小浏览器：合法场景A→B→A，正常画面与菜单仍可操作；并发/失败/读档原子性走实际宿主测试。
  剧情视觉/full/R4/N6b/Q1/Q2仍按原计划，旧版本兼容审查单列。

## 推进签字

### build前

- Codex：2026-09-25 r1 premise verified / design agree；上述源码已直读，替代解释与反证标准如上。
- Kimi/GLM：用户2026-09-24全架构队列豁免，未代签；无独立第三方审查声称。
- build准入：build allowed，范围锁在结构迁移与保真回归。

### done前

- Codex：2026-09-25 对实现fdad980f签accept（实施者自验、自审；用户豁免另外两席）；
  [回执](../../../../testing/scene-preparation-refactor.md)和[机账](../../../../testing/scene-preparation-refactor-evidence.json)：
  26新增/36正控11针/16冻结对照/18函数+2宿主AST保真；check8525、ratchet/单次strict8034/641、build与浏览器往返通过。
- Kimi/GLM：用户豁免，未代签。
- done准入：本段done；用户架构队列独立授权、Codexaccept与全部本地验证齐，旧兼容审查pass。
  A3整体仍待剩余职责，13大批计数维持2/13；不关闭其它缺陷或E2E边界。

## 交接日志

- 2026-09-25 Codex：同步main cb1cb26d且干净；上一段远端文档成功、coverage当时仍在跑。
  直读场景加载/缓存/依赖/读档提交调用域，锁定纯抽取边界；使用Vitest/pnpm技能成组验证。
- 2026-09-25 Codex：SceneResources/ScenePreparer落地，main6427→6260；保存提交、移动、绘制不改。
  Vitest/pnpm/Vite技能用于真实链回归和隔离反例；全部本地门禁通过，六包基线完全不变。
  cb1远端旧battle-host等待预算失败已用独立ad16ba94修复，原驱动红/新驱动绿，远端双门均success。
  浏览器s135→s134→s135后菜单正常，error/warn空；临时页和6051服务已清理，无用户存档IO。
- 2026-09-25 Codex：核定fdad980f本段done并归档；更新看板、索引、统计机账。
  本轮远端CI随收口push触发，不把ad16的成功冒称为fdad候选的CI结果；后续核实时单列报告。

## 下一位Agent提示词

无下一位Agent提示词，Codex独立实施并核定本段；GLM八包不等待、不交叉修改。
