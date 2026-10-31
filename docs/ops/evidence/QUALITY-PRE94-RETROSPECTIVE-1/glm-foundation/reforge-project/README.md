# 批47:reforge project/IO 族 15 文件（零整改批）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「批47:reforge project/IO 族 15 文件（零整改批）」的主题按原文时点保留(摘录:> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见当前返工记录。 范围：`file-source.ts`)。

## 范围与证据

原报告含章节[批47:reforge project/IO 族 15 文件（零整改批）、逐件结论（要点）、登记移交（无新增）、验证]、1个链接;固定main源4113B(SHA b622109093a5)。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4113B / SHA-256 b622109093a5e1658af940b99c61ace7309fcf4bfdeebf398df547a341114329；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 批47:reforge project/IO 族 15 文件（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`file-source.ts`(54)、`fsa-source.ts`(66)、`project-image-cache.ts`(65)、`project-save-state.ts`(76)、`startup-entry.ts`(63)、`scene-resources.ts`(72)、`scene-entry-session.ts`(82)、`scene-switch-transaction.ts`(105)、`runtime-input-router.ts`(56)、`scene-preparer.ts`(218)、`runtime-frame-session.ts`(189)、`runtime-project-view.ts`(288)、`project-map.ts`(463)、`project-loader.ts`(532)、`index.ts`(362)。全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。

## 逐件结论（要点）

- **file-source / fsa-source**:工程「从哪读」单一抽象;404→NotFoundError 语义、save-state 走 no-store、fsa 逐段句柄遍历每步 throwIfAborted、blob URL 集中 revoke。
- **project-image-cache**:缓存键只用稳定 AssetId 但每次调用仍先过 resolver.record 校验 expected kind(防同 id 错语义复用);pending 失败自动驱逐。
- **project-save-state**:只读作者保存准入协议(磁盘记录永不授予写权);键集精确排序校验;200 HTML/空文件/坏 JSON 明确不是「缺记录」;withStableProjectRead 前后双读 token 防读取期间新保存。
- **startup-entry**:入口是稳定 id 指针不得退化为数组首项;非法显式 id 报告后回直接启动;intro 只属菜单新开一局。
- **scene-resources**:工程域资源所有权(LRU 16 地图,保旧完成请求的保护语义);references() 顺带把全场景灌入 canonical 缓存。
- **scene-entry-session**:跨场景呈现事务单一生命周期;heldFrame 只在 preparing 冻结旧帧;reveal 与 preflight 契约逐字段一致性校验(kind+参数)。
- **scene-switch-transaction**:冻结预检实际消费的可变依赖(金钱/flags 无关变化不取消切场);present 后再 assertCurrent 才进同步 commit;过期请求不清后来者画面。
- **runtime-input-router**:层优先级显式(confirm>shop>reward>menu>dialogue>script>探索);reward 推进不给下层同键穿透;探索分支后同步复查 menu/dialogue 状态变化。
- **scene-preparer**:IO 前冻结(world/script/overrides 三路 structuredClone);并行加载 map/palette/sprites/prepareSounds;assertCurrent 复用同一依赖足迹;页动作缺可解析精灵 fail-loud。
- **runtime-frame-session**:帧相位顺序(激活 confirm→恢复 gate→时钟→等待定时器→fade→对话 settle→消费按键→世界推进→实体动作→战斗呈现→输入路由→呈现);「定时器就绪但 continuation 跟随世界单一提交」防新注册移动先于首绘;setPaused 暂停语义保留剩余量。
- **runtime-project-view**:canonical 嵌套世界态→渲染宿主平面投影(绝不用于保存);行为投影只放空 stages(防旧解释器执行真脚本);captureRuntimeSceneBehaviorDependencies 只收目标场景消费的已解析输入。
- **project-map**:错排 lattice 几何单一真源(latticeCenter/pixelToLattice/latticeInRect);paint 的 touchedRows 精确拷贝+tilesetRefs 排序重映射;heights 稀疏物化(全 0 不落盘);缩图/删层保护 stamp 组合 fail-loud。
- **project-loader**:current 装配全验证链(contentVersion/minimumSaveVersion/禁 content.scripts/场景 id 一致/对话树解析/五类交叉引用);assembleCurrentProject 纯函数(供编辑器直调);loadCurrentProjectFrom 包 withStableProjectRead;入口场景去重读取带 owner 定位错误信息。
- **index**:editor 复用面 barrel;runBattleTrial 懒加载独立 DOM host(纯配置调用不加载其 UI)。

## 登记移交（无新增）
本批无新清理候选。(runtime-project-view.ts:87-92 entryAtCursor 的 `ReturnType extends infer` 恒真条件类型为装饰性写法,行为无影响,不值一次返工。)

## 验证
- 定向测试:32 个测试文件 243/243、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
```
<!-- incremental-original-source:end -->
