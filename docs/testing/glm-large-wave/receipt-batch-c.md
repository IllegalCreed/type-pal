# TEST-GLM-LARGE-WAVE-4 · C 批回执（Reforge 脚本与演出助手）

- 候选 SHA：见本批提交（分支 `codex/glm-large-wave-r1`）
- 逐条 file/fullName/status：[batch-c-directed.json](batch-c-directed.json)（7/7 passed）
- 新增文件：`packages/reforge/src/script-chunk-store.glm-large-wave.test.ts`（5）、
  `packages/reforge/src/dialog/dialog-box.glm-large-wave.test.ts`（2）
  + C 视觉宿主 `browser-host/{host-c.tsx,index-c.html,vite.config.c.mts,drive-c.mjs}`。
- 门禁：reforge `tsc --noEmit` 0 诊断；新增文件 Biome error/warning/info 全零；
  `node scripts/docs/check.mjs` PASS；`git diff --check` 干净。

## 每组处置（旧测去重结论）

| 组 | 源文件 | 处置 | 依据 |
|---|---|---|---|
| C01 | script-runner.ts | existing-proof | `script-runner.test.ts` 49 例（场景覆写/黑幕配对/loadScene 落点/startBattle/teleportOut/confirm/call-jump 栈/self 继承/递归深度/并发 runner/全局停止/abort 间隙）+ `script-runner.conditions.residual` 4 例（六算子同源、场景/实体/朝向、装备背包金钱满血、all/any/not 短路）——「当前条件/步骤返回、终止/等待」全轴已证 |
| C01 | script-runner-core.ts | existing-proof | `script-runner-core.test.ts` 19 例：debugger 钩子四类暂停/中止/失败边界、stage 游标提交、terminal 不重放、source 前缀+持久尾循环、continue 同步/advance 提交收尾——固定 tick 与终止语义已证 |
| C02 | script-host-adapter.ts | existing-proof | 基础 6 例（canonical 委派/EntityAddress 解包/瞬态过滤）+ current-dispatch 5 例（E4 立即类全参数、E5 await 类时序/同 signal/错误传播、E6 输入保真）+ wave2 6 例（leaf 全参数、跨场景过滤、可选缺席、playEntityAction 前后台失败）——「effect 分派显式参数」已证 |
| C02 | script-world.ts | existing-proof | `script-world.test.ts` 13 例（页选择/state-map handoff/activation lease CAS/save barrier）+ wave2 8 例（initialFlowCursor、assertFlowCursor 四类拒绝、resolveEntityBehavior/SceneHook、evalAuthorCondition 全条件臂）——「页面/flow cursor 解析」已证 |
| C03 | script-project-core.ts | existing-proof | `script-project-core.wave2.test.ts` 11 例：命令落地逐命令一次通知、setMultiEntityState、addVar 累加、moveEntity 提交控制六边界（未提交自动提交/幂等/提交前 abort/场景漂移/会话漂移/提交后 abort）、宿主等待方法——「公开读取与缺失失败」的拒绝侧由 runtime-script-project「rejects unknown targets before mutating any world authority」证到 |
| C03 | runtime-script-project.ts | existing-proof | 7 例：actor-condition leaf 经当前编译器与宿主、moveEntity 端点提交控制穿透、branch/loop/共享脚本控制流保留、未知目标拒绝、abort 前后语义、已退役 vanishEntity 编译封闭、真实装载工程直交 runtime |
| C04 | script-chunk-store.ts | **新增 5 测试** | ScriptChunkStore 侧已有 9 例（on-demand imports/hint 重推导/缺失诊断/abort 不回填/并发去重/预算租约/迟到 abort/缓存命中）；`MemoryScriptResolver` 此前**零直接测试**——新增提示命中归一、错误 hint 按稳定 id 重推导、chunk 缺失 vs script id 缺失诊断、进入即拒 AbortError、空表按 chunk 缺失拒绝 |
| C04 | dialog/dialog-box.ts | **新增 2 测试** | 已有 center/narration 无箭头 + observation 3 例（观察冻结/分页/auto 尾/narration render 门/结束清空）。新增：异槽共存推进到 top 后 close，重开单槽对话旧槽渲染零残留（draw 快照断言）；关闭后 advance/render/close 幂等 noop |
| C05 | dither-transition.ts | existing-proof | 11 例：palette plan 亮度轮廓、六相位 RG_INDEX 错峰、visits 边界、单像素步进、4× 点阵整块、未访问保持 source alpha、边界钳与缓冲别名拒绝、controller entry previous frame |
| C05 | frame-animation-player.ts | existing-proof | FrameSequenceReader 并发去重/LRU、playFrameAnimation 闭合区间+frameRate 顺序、越界/加载失败 fail-loud、剧情默认不可跳过 vs 显式 skipKeys、signal 取消即停不提交后续帧——「真实小 TPFS 解块与帧时长」已证 |
| C06 | entity-action-player.ts | existing-proof | `entity-action-player.test.ts`（resolveSpriteActionPosition/Binding、Player 三段）+ boundaries 9 例（fixture 合法性、binding 六拒绝轴、startAtMs 越尾、三条无基础轨收尾、覆盖期间 setBase 删除/替换）——「显式 action binding/position」已证 |
| C06 | world-motion-runtime.ts | existing-proof | 基础 10 例（cadence/carry/frozen reset、party 替换唤醒、端点完成 detach、durable 槽共存、chase 槽位、步态/朝向 epoch、trace 克隆与清除、场景拆卸）+ residual 5 例（authority 换代 dropped、追逐两种丢弃、侧避锁、阻挡原因按稳定顺序、诊断上限淘汰）——「有界时间推进」已证 |

## 登记为不可达/未证

- 「C 批只取一条固定小输入的 dialog/帧演出视觉」：视觉字形为固定 8×8 点阵替身
  （与 dialog-box 观察测试同界），证明槽位推进/共存/清空行为，不证明真实字体渲染；
  光标帧空数组，箭头绘制由 dialog-box.test 单测覆盖，不在视觉中重复演示。

## 业务反控（共用 judge，2 枚全 VALID）

| 针 | fullName | 结果 |
|---|---|---|
| derived 命中 ref 归一断言改错 | MemoryScriptResolver current semantics > 错误 hint 不掩盖正文：按稳定 id 重推导命中另一 chunk | 恰 exit1、AssertionError、唯一失败、产品 hash 不变 |
| 重开残留断言取反 | 异槽共存推进后关闭，重开单槽对话不残留旧槽渲染 | 同上 |

## 隔离功能视觉（端口 6088，1 条）

证据 JSON：[browser-host/evidence-browser-c.json](browser-host/evidence-browser-c.json)；console 错误 0。

| 条 | 截图 | SHA256 | 视口 | 步骤→预期→实际 |
|---|---|---|---|---|
| C1 DialogBox 槽位共存 | C1-dialog-bottom-slot-1000x720.png | f47e484ac3897bf198db93bfb67ce3c4403a5753e352baa7f3222444988567b3 | 1000×720 | 打开对话 → bottom 槽 speaker+正文打字 → observe.slot=bottom、phase=typing（已看图） |
| | C1-dialog-top-slot-1000x720.png | 8912e9d47b0b0210df5d91f6841181ff728acfe6f2f2d1d9faf074d087bad845 | 1000×720 | 推进下一段 → top 槽接棒（canvas 上方新文本打字中、bottom 槽留显全字）→ observe.slot=top、cueIndex=1（已看图） |
| （收尾态） | — | — | — | 关闭 → observe=(closed)、状态 closed → 一致 |

URL `http://127.0.0.1:6088/index-c.html`；直挂范围声明：真实 DialogBox + 真实 rAF 清屏重绘循环，
字形为固定点阵替身，不冒充完整引擎画面。

## 未证项汇总

- 上述视觉字形替身 1 条；其余 10 个源文件按 existing-proof 处置（依据见表）。
