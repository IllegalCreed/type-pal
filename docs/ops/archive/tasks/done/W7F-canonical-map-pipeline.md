# W7F - 单一新版地图管线（无损迁移、地图库、图层与高度导航）

Status: done
Phase: phase2
Capability: W7 / W1 / W3 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex
Unavailable Agents: none
Branch: main

## 目标

把旧 `Tilemap` 严格封在提取器和迁移器输入端。迁移器将全部 PAL 地图无损转换为工程唯一的
新版地图文件，并产出稳定地图库、tileset 注册和场景 `mapId` 引用；content、reforge、
editor 此后只认识这一种地图模型。所有迁移地图与作者地图均可在同一地图编辑器中创建、选择、
修改、复制和换绑，不再存在“复用原版地图只读”支路。地图编辑器同时提供图层导航尺和格子高度
导航尺，便于聚焦并编辑指定图层、指定高度。

## 范围

- 范围内:
  - 用 `ProjectMapV2` 统一迁移地图和作者地图：尺寸可变、N 个视觉层、每个瓦片格子实例自己的
    高度矩阵、独立碰撞矩阵、稳定 tileset id。
  - `MapIndexV1` 成为所有工程必需的地图发现真值；`SceneDef` 只以稳定 `mapId` 绑定地图。
  - 迁移 `data/extracted/data/tilemap/*.json` 的全部 223 张源图，而不是只迁移被场景直接引用的图。
  - 迁移 295 个源场景中的 294 个有效场景；精确识别并排除 `s294/mapNum=0` 空 stub。
  - 把 opcode `0x99` 的旧 `mapNum` 在迁移时解析成 `mapId`；世界状态和重载接口只存/收 map id。
  - 为全部 PAL tileset 生成稳定 `TilesetDef`；地图只引用 `tilesetId`，禁止路径直通。
  - 移除 content/reforge/editor 中的 `ReuseMap`、`reuseOriginalMap`、`Tilemap | ProjectMap`
    联合、旧 word 解码、旧碰撞分支和“原版地图只读”UI。
  - 地图库列表、搜索、创建、复制、改名、删除守卫、场景选择/换绑/打开地图，以及未引用地图发现。
  - 引擎和编辑器均按 map id 懒加载地图；编辑器不得为显示列表而一次解析全工程地图正文。
  - 地图编辑器增加图层导航尺、高度导航尺、组合聚焦、画笔高度和吸管高度闭环。
  - MG2 把地图索引按 id 合并，把单张地图文件作为原子三方合并单元，保护作者修改。
- 范围外:
  - 不在本卡转换 `.rle` 瓦片图像的像素格式；只把每个 tileset 登记为稳定资产。
  - 不在本卡完成“所有二进制资源复制进工程”的资源自包含总任务；未来改资产路径时不影响 map id。
  - 不在本卡清理与地图无关的 `unmigrated` opcode、精灵双轨、音乐/音效裸编号；另卡处理。
  - 不做超大世界 chunk 流式地图；单张地图仍是有限、尺寸可变的 lattice。
  - 不做 autotile、stamp、随机笔刷和跨地图拼接。
- 明确不做:
  - 不允许 editor 或 reforge 在运行时把旧图“首次打开时转换”。转换必须发生在迁移/升级边界之前。
  - 不允许任何新版地图字段携带旧 `word/mask/lower/upper/h/mapNum` 概念。
  - 不把格子高度放入 `TilesetDef`。tileset 最多描述图像资源，不拥有地图放置实例的高度真值。
  - 不把所有地图打进单个 JSON，也不因地图列表而把所有地图常驻浏览器内存。
  - 不对 map 文件做静默逐格三方合并；源转换和作者修改同时变化时必须报告冲突。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md` 铁律 4、5、10：架构第一、稳定 id、迁移缺陷先修上游。
  - 用户 2026-07-14：进入编辑器的地图必须全是新版格式；迁移的职责就是把旧格式转换完，
    编辑器不允许两套格式并行。
  - 用户 2026-07-14：地图高度属于格子实例，不属于瓦片元数据。
  - 用户 2026-07-14：地图编辑器需要类似楼层条的图层/高度导航滑块；当前值高亮，其他内容变暗。
  - 用户既有要求：地图列表具备新建/编辑等完整闭环；场景地图可选择；迁移产物不能膨胀成单体巨物。
- 代码锚点(`file:line`):
  - `packages/pal-extract/src/resources/map.ts:9-52`：旧源每 cell 的 lower/upper 两个 u32。
  - `packages/reforge/src/render.ts:19-23,376-386`：旧 tile id 与每次放置高度的真实解码公式。
  - `packages/reforge/src/collision.ts:42-59`：旧 bit13 是对应 lower/upper 子格实例的碰撞值。
  - `packages/content/src/own-map.ts:1-26`：当前 OwnMap v1 缺少格子实例高度。
  - `packages/content/src/tileset.ts:6-16,68-84`：当前错误地把高度放在 tileset 并按 tileId 查询。
  - `packages/content/src/index.ts:117-179`：当前 `ReuseMap | OwnMapRef` 双模型。
  - `packages/migrate/src/migrate-content.ts:1692`：迁移器当前只输出 `reuseOriginalMap`。
  - `packages/migrate/src/translate-events.ts:700-701`：0x99 当前把 mapNum 泄漏进新版命令。
  - `packages/reforge/src/scene-map.ts:1-31`：运行时当前双格式分流。
  - `packages/editor/src/ui/MapMode.tsx:520,676,1003`：编辑器当前原版地图只读支路。
- 已知坑 / 审计数据:
  - W7D 的“per-tile 高度属瓦片固有属性”结论错误；本卡明确推翻，不复用 W7D 该项签字。
  - 源图 223 张、源场景 295 个；场景直接使用 222 个 mapNum，59 张图被多个场景共享，最多 4 个场景共用。
  - map 104 无场景直接引用，map 164 只被换图脚本引用；二者仍必须进入地图库。
  - `s294` 是已知空 stub：mapNum=0、无实体、无脚本、无有效入边，源侧也没有 tilemap/0.json。
  - F1 可复现审计中，同一 `(tileset,layer,tileId)` 出现多个高度的组合有 14,148 个，证明 tileId
    无法决定高度；此前 14,160 为不可复现的临时统计，已由脚本结果替换。
  - 3,653,632 个子格实例中，视觉层 0 非零高度 120,910 个，视觉层 1 非零高度 83,253 个；
    碰撞实例 168,197 个。高度与碰撞都属于具体坐标。
  - F1 审计实测源 tilemap JSON 共 107,671,067 bytes；V2 行紧凑格式共 52,517,553 bytes，
    比率 0.487759。此前 47.8 MiB 为估算，现由 `pnpm --filter @type-pal/migrate audit:maps` 复现。
  - 旧 W7E 设计及签字已由用户裁决取消，见 `docs/ops/archive/tasks/cancelled/W7E-map-library-scene-binding.md` 顶部。
- 不得重新引入:
  - `reuseOriginalMap`、运行时 `Tilemap`、路径即身份、mapNum 运行时引用、tileset 路径直通。
  - `TilesetDef.tiles[].height` 或任何 `tileId -> height` 运行时映射。
  - 地图加载时猜格式、编辑器首次编辑时转换、contentVersion 双模型长期共存。
  - 把 223 张地图或全游戏脚本打进单文件、编辑器启动时全量解析地图正文。
- 相关测试:
  - `packages/content/src/own-map.test.ts`、`validate-refs.test.ts`、新 map index/schema tests。
  - `packages/reforge/src/render.test.ts`、`collision.test.ts`、`scene-map.test.ts`、`loader.test.ts`。
  - `packages/editor/src/core/commands.test.ts`、`project-io.test.ts`、clone/zip/open-local tests。
  - `packages/migrate/src/migrate-content.test.ts`、`translate-events.test.ts`、MG2 merge/bootstrap/integration tests。

## 验收条件

- 功能:
  - `projects/pal` 迁移后有 223 个地图资产和对应 tileset 注册；map 104、164 均可在地图列表找到。
  - 294 个有效场景只保存 `mapId`；共享同一旧 mapNum 的场景继续引用同一个 map id。
  - `s294` 仅在精确 stub 断言成立时排除；签名不符必须 fail-loud，不能泛化成“mapNum 0 都丢弃”。
  - 0x99 两个现有站点迁为 map id；运行时切图、持久 world override、保存/读档均不出现 mapNum。
  - 每张迁移地图可直接在地图编辑器修改并保存，没有只读原版分支；场景可换绑、复制后换绑。
  - 地图库可发现未引用地图；被引用地图禁删，解除引用后可删，undo 恢复索引、文件和引用。
  - 地图编辑器图层导航尺可拖动/点刻度/滚轮切层；当前层全亮并成为绘制目标，其余层变暗。
  - 高度导航尺可聚焦高度 0、1、2...；当前高度全亮，其余高度变暗；图层与高度条件可叠加。
  - 当前高度作为画笔写入值；吸管同时读取 tileId 和该实例高度。聚焦状态只属编辑器 UI，不写地图文件。
  - 提供临时“显示全部”开关；碰撞、选框、hover 等编辑反馈不得因变暗而不可辨认。
  - 打开 PAL 编辑器只加载 map index 和当前地图；切图按需读取，脏地图不得被 LRU 静默丢弃。
- 测试:
  - 逐位转换测试覆盖 layer0/layer1 tile id、两层实例高度、bit13 碰撞、空 layer1 和边界值 0/15。
  - 全量迁移审计：223 图全部产出；场景、0x99、tileset 和 map index 引用零悬空；共享关系不被复制开。
  - 新 schema guard 覆盖矩阵尺寸、layer id 唯一、非负高度、null tile 必须 height=0、未知 tileset/map id。
  - renderer/collision 只接 `ProjectMapV2`；代表性室内/室外/多高度地图做旧源转换前后像素与碰撞采样对照。
  - editor Command 覆盖图层/高度绘制、吸管、CRUD、换绑、删除、undo/redo；输入不 mutate。
  - lazy store 覆盖加载去重、切换、脏文档 pin、失败恢复、保存/clone/zip 对未加载文件的 copy-through。
  - MG2：map index 按 id；单图 theirs=base 保 ours、ours=base 收 theirs、双方变化报冲突；连续第二次迁移零计划。
  - 静态边界门禁：`packages/content|reforge|editor` 不得引用 `Tilemap`、`reuseOriginalMap`、
    `cell.lower/upper` 或旧地图 word 解码；仅 pal-extract/migrate 输入侧允许。
  - 根 `pnpm check`、editor production build、PAL 全量迁移与第二次 dry-run 全绿。
  - 迁移后地图目录的确定性序列化总字节不得超过源 tilemap JSON 总字节的 1.25 倍，且无全图单文件。
- 文档:
  - 修订 content-schema、decisions、engineering-notes、editor-design、asset pipeline 和 capability map。
  - 明确旧格式只存在于 pal-extract/migrate 输入；W7D/W7E 旧兼容结论标为 superseded。
  - 另记后续债：脚本 `unmigrated` 运行时解释器、精灵/音乐/音效资源身份清理。
- 视觉 / 手工验证:
  - 1280、900、720 三档验证地图库、场景换绑、图层尺、高度尺和画布，无遮挡、溢出或不可达控件。
  - 至少选三张含不同高度的 PAL 地图，逐级拖高度尺，确认仅匹配格子保持正常亮度。
  - 组合验证“指定图层 + 指定高度”、吸管后继续绘制、撤销/重做、保存重开。
  - 引擎从开场连续跨场景，含 0x99 换图站点，地图、碰撞和遮挡正常；控制台零错误。

## 推进签字

签字是阶段门禁。W7F 同时涉及 schema、migration、asset pipeline、跨包公共接口和编辑器工作流，
旧 W7D/W7E 的任何签字均不得复用。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-14）**。旧图可逐子格无损展开为统一 lattice；高度与碰撞均有明确实例位置。
  采用单一 `ProjectMapV2`、稳定 map/tileset id、迁移期全量产图、运行时和编辑器懒加载，能同时满足
  架构边界、编辑闭环和体积约束。dense 矩阵优先保证编辑/验证简单，行紧凑格式化解决 JSON 膨胀。
- Opus: **agree（2026-07-14,附 M1-M5 必改 + S1-S2 建议）**。地面核验:转换公式与 render.ts:19-23/376-386 逐位一致(L0=`(d&0xff)|((d>>4)&0x100)`/L1 经 hi=d>>>16 同式再-1/高度 8-11 与 24-27/collision bit13);223 源图、s294=`{mapNum:0,eventObjects:[]}` 精确 stub、0x99 恰 2 站点全部实证;**map1 单图 70 个 tileId 携带多高度 + 残差位全零**——"高度属实例"铁证与无损假设双双有据。七点详见主审立场。
- GLM: **agree（2026-07-14;附 M1 数据证据补落 + N1-N3 非阻塞,见下）**。五项复核逐条：

  **(1) 迁移覆盖矩阵——验收条款与测试节逐条映射**：

  全量源数据独立核验（不依赖卡内断言，独立 find/grep 实测）：
  - **223 源图**：`data/extracted/data/tilemap/` 实测 223 个 JSON。✅ 验收 §95"223 个地图资产"映射 F2。
  - **295 场景 / 294 有效**：`data/extracted/data/scene/` 实测 295 个。`294.json` = `{sceneId:294, mapNum:0, eventObjects:[]}`，精确 stub 签名一致；`294.json` 是唯一 mapNum=0 场景，且无 `tilemap/0.json`。✅ 验收 §97"s294 精确 stub 断言"映射 F2。
  - **59 图共享 / max 4 场景**：实测 222 个不同 mapNum（含 s294 的 0），59 个被多场景引用；mapNum 74/114/176 各被 4 场景共享（tie）。✅ 验收 §96"共享同 mapNum 复用同一 map id"映射 F2，共享关系不被复制。
  - **map 104 / map 164 未直接引用**：`grep mapNum:104` 和 `164` 在场景目录零命中；164 仅经 scene-230 的 0x99 引用（operands `[65535,164,0]`）。✅ 验收 §95"map 104、164 均可在地图列表找到"映射 F2——以 tilemap 目录为全集（§277），场景/脚本只做引用。
  - **0x99 恰 2 站点**：scene-230→164、scene-243→165，`objects.json`/`shared.json` 零命中。✅ 验收 §98"0x99 两个站点迁为 map id"映射 F2。当前 `translate-events.ts:698-701`（卡锚点 :700-701 偏移 2 行，实际 698 起）emit `setMapOverride{mapNum}` 泄漏数字，需改 resolver。

  **覆盖矩阵缺口：零漏项。** 223/294/59/104/164/0x99 全部可追溯到验收条款与 F2 分期。

  **(2) 体积门禁口径——47.8MiB 估算复算**：

  - **源体积实测**：`du -sh tilemap/` = 103M（103.13 MiB），卡内 ~102.7MiB 吻合。✅
  - **47.8MiB / 230MiB / 子格计数（3,653,632 / 120,910 / 83,253 / 168,197）**：**这些数字仅出现在本卡 markdown 和 Opus 引用中，仓库内无任何脚本/测试/审计文档产出它们。** 子格总数 3,653,632 = 16,384×223 可由 `pal-extract/map.ts:9-13` 的 `Tiles[128][64][2]` 算术推导一致；但 per-layer 非零高度/碰撞分解（120,910/83,253/168,197）和 47.8MiB/230MiB 体积估算**不可从已提交代码复现**。
  - **结论（非阻塞，M1 build 必落）**：47.8MiB compact 是 ad-hoc 估算，1.25× 上限门禁（§117）依赖它。**F1 必须产出可复现的体积审计脚本**（全量 V2 序列化字节计数），把 47.8MiB 从断言变成测试钉死的真值。卡内 GLM 复核提示词 :363 已把此项标为待复算——方向正确，build 时落脚本即可。
  - 行紧凑格式化器方向正确（pretty 膨胀 230MiB 的风险真实），M4"migrate/editor 单一来源 + 字节相同测试"封住了格式 diff 漂移。

  **(3) M1 三项审计的测试可操作性**：

  M1 = 无损全量定理化：(a) bits 14-15/29-31 残差扫描；(b) 空 top tile 携非零高度计数；(c) 全图 V2→重编码往返等式。
  - **(a)(c) 可操作性**：全图线性扫描 3,653,632 子格，纯 JS 数组操作，单图 16,384 格 × 223 图——秒级完成，测试矩阵完全可行。✅
  - **(b) 可操作性**：layer-1 tile 解出 -1（null）时高度位计数，同样线性扫描。✅
  - **关键数据证据缺口（M1 必落，非阻塞）**：Opus 引用的"map1 单图 70 个 tileId 携带多高度"作为实例高度铁证——**我独立用 render.ts:19-23 公式复算 map1（16,384 子格）得 90 个多高度 tileId（L0 38 + L1 52），不是 70。** 定性结论（tileId 无法决定高度、高度属实例）**仍然成立且证据充分**（90 个多高度 tileId 比声称的 70 更强）；但具体数字 70 不可复现。**M1 审计脚本必须用可复现的精确计数替换卡内所有 ad-hoc 数字**，且全图往返等式审计本身会产出权威的残差/高度统计——build 时以脚本输出为准，不以卡内数字为准。

  **(4) S1/S2 裁定**：

  - **S1（原子 map 文件 baseline hash 化省 ~48MiB）**：**采纳。** 实测 `migration-baseline.ts:33,44-48` 的 `_state.json` 已记录 per-file sha256（`files[path] = sha256(serializeMigrationJson(value))`），且 `loadPalBaseline:63` 对不匹配 throw。原子合并单元只需 hash 相等性判定（§113 theirs=base 保 ours / ours=base 收 theirs / 双变报冲突），不需要完整 baseline 值。省 baseline ~48MiB Git 负重，冲突报告以三方 hash+路径呈现即可。**M4 格式化器单一来源保证编辑器保存不改字节 → baseline hash 不漂移 → S1 成立。**
  - **S2（flat 层 heights 矩阵可省略，guard 视缺席=全零）**：**采纳。** 迁移图不受影响（§195 两视觉层均用 height 模式）；作者纯铺底层省一半字节。guard 只需把"flat 层无 heights 字段"等价于"heights 全零"。与 M5(b)"flat 层被选为绘制层且高度>0 时禁写高度"配合，flat 层永远不出现非零高度。

  **(5) 静态边界门禁 grep 口径可执行性**：

  实测当前下游（content/reforge/editor）旧格式引用分布：
  - `Tilemap`：content(own-map.ts) + reforge(scene-map/render-scene/assets/collision/render/index + 3 test) + editor(App.tsx) = 待删
  - `reuseOriginalMap`：content(validate/validate-refs/index + 3 test) + reforge(scene-map/main + 2 test) + editor(7 test) = 待删
  - `cell.lower/upper`：reforge(collision/render + 1 test) = 待删
  - word 解码 `>>>16/&0x100`：reforge(render.ts) = 待删
  - **grep 口径完全可执行**：F6 门禁 = `grep -r "Tilemap\|reuseOriginalMap\|cell\.lower\|cell\.upper" packages/{content,reforge,editor}/src` 零命中（仅 pal-extract/migrate 输入侧允许）。当前命中点是迁移删除清单，F6 验收时它们必须全部消失。✅

  **总结**：迁移覆盖矩阵零漏项（223/294/59/104/164/0x99 全实测）；体积口径 47.8MiB 需 F1 落可复现脚本（非阻塞）；M1 三项审计测试可操作，但 **map1"70"数字不可复现（实测 90）→ M1 审计脚本必须用脚本输出替换卡内 ad-hoc 数字**；S1/S2 采纳；静态门禁 grep 口径可执行。**agree**。

  **M1 数据证据补落（build 必落项）**：F1 审计脚本产出后，用脚本实测值替换卡内 §75-79 的体积/计数断言和 Opus 引用的"70"——定性结论不变，具体数字以可复现脚本为准。

  **N1-N3 非阻塞观察**：
  - **N1**：卡内代码锚点 `translate-events.ts:700-701` 实际为 `:698-701`（0x99 handler 起于 698）；build 时修正锚点。
  - **N2**：0x99 两站点均为 op0=0xFFFF（当前场景即时换图），不跨场景目标——resolver 只需把 mapNum→mapId，不需处理跨场景 scene 参数。简化 F2 的 0x99 迁移。
  - **N3**：mapNum 165 经 scene-243 的 0x99 引用，与 mapNum 164（scene-230）对称——卡内只提了 104/164 为未直接引用，165 同属此类（0x99 独占），F2 全集审计会自然覆盖。

- counter / 分歧处理: Opus 无架构 counter;M1-M5 为设计补明(Codex 落卡后 GLM 一并复核),S1/S2 经 GLM 复核采纳。GLM 标注 M1 数据证据补落(卡内"70"实测为 90,定性不变,以脚本为准)+ N1-N3 非阻塞。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** M1-M5 必改 + M1 数据证据补落(F1 审计脚本替换 ad-hoc 数字) + S1/S2 采纳 + N1-N3 非阻塞纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-14）**。已完成实现自审、全仓门禁、迁移双跑、三档浏览器与
  demo/e2e-own 工程加载验证；实现符合单一 ProjectMapV2、实例高度、懒加载/copy-through 和
  地图编辑闭环设计；后续 Opus/GLM 已独立复验并签 accept。
- Opus: **accept**（2026-07-14,基线 c2589fb2;五点复核全过——①静态边界独立 grep:content/reforge/editor 零 Tilemap/reuseOriginalMap/lower-upper/word 解码;②M2 落地实锤:save/ops.ts:65-72 对数字 mapOverride 显式抛"旧存档…无法安全转换",fail-loud;③M3 按"undo 引用禁淘汰"落地且双测试钉住(edit-session.test:151 干净图可淘汰/撤销链触及图保存后仍 pin/切图后可 undo;project-io.test:195 未加载图 copy-through 不 parse),定向 96+22 测试独立复跑绿;④0x99 双站点产物 s230/s243 setSceneMapOverride mapId,renderer/collision 测试绿,**6051 前台运行时实测**:开场 16s 可控(dither 零帧锚 true)→s001→s003 跨场景渲染正常(中心亮度 147)、console 零 error;⑤6010 实测:223 图地图库(共享计数正确,map-104/164 在库)、＋⧉✎− 四操作、图层列表+吸管带实例高度+聚焦开关、高度输入接受超当前最大值(M5a 数值输入方案落地)。M1/M4 抽验实锤:project-map-audit 语义位往返失败即抛(3,653,632 实例差异 0 即其产物);formatProjectMapV2 单一来源于 content+字节幂等测试+editor 共享断言。**审查方法学注记**:复验初期测得 6051 "1fps",追查为 Chrome 后台标签 rAF 节流伪装的假回归(置前台即 119.5fps 满帧)——M3 审查期同症疑云同因,CLI 浏览器验证必须 bringToFront,已记入工作方法。无返工项）
- GLM: **accept（2026-07-14;见下）**
- counter / 返工处理: 无。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex + Opus + GLM accept），用户已确认验收，任务完成。**

### GLM done 前覆盖复验（2026-07-14）

增量范围：c2589fb2（实现）+ 8add57a5（Opus 复验签 accept，仅改任务卡）。未改实现文件，独立实测 + 全包测试复跑。四包 820 tests pass + 1 skip（content 172 / reforge 329 / editor 163 / migrate 156+1skip）。

**(1) M1 审计脚本可复现性 + ad-hoc 数字替换** ✅
- `pnpm --filter @type-pal/migrate audit:maps` 独立实跑，输出逐位匹配：`mapCount:223 / latticeInstances:3653632 / semanticRoundTripMismatchCount:0 / sizeRatio:0.487759`。
- 审计源 `project-map-audit.ts` 全量扫描 223 图 × 每子格（非采样），残差 mask `0xe000c000`（bits 14-15/29-31），V2→重编码往返等式 `semanticRoundTripMismatchCount!==0` 即 throw（:160-161）。
- F1 审计发现已记录（§417-426）：残差位 4 处（map 133/188/195）+ 空 top 孤立高度 3 处（map 77/133），raw word 差异 6 处但语义字段 3,653,632 全等。
- **设计签时标的"70 不可复现"问题已由 M1 脚本产出权威数字解决**：多高度 `(tileset,layer,tileId)` 实测 14,148（非卡的 14,160）；卡内 ad-hoc 数字已由 F1 审计结果替换。

**(2) 静态边界门禁实测 grep 零命中** ✅
- `Tilemap`：content/reforge/editor 零命中。
- `reuseOriginalMap`：content/reforge/editor 零命中。
- `cell.lower/upper`：content/reforge/editor 零命中。
- 三模式独立 grep 全部 zero，旧格式仅存于 pal-extract/migrate 输入侧。F6 门禁通过。

**(3) 迁移覆盖测试矩阵逐条映射** ✅
- **223 图产出**：`projects/pal/content/maps/` 实测 223 个 `map-NNN.json` + index.json（`maps.length===223`）；map-104/164 在库且文件存在。pal-migration-integration.test.ts:82,143 断言 `validation.maps===223`。✅
- **294 场景 / s294 排除**：场景目录实测 294 个（s000-s293），无 s294.json。`pal-migration-io.ts:56-68` 精确 stub 断言（mapNum===0 + eventObjects=[]）+ `scenes.slice(0,294)`。✅（注：stub 排除分支无独立单测，经 integration test 覆盖——非阻塞）
- **共享 mapNum 复用同 id**：294 场景引用 221 个不同 mapId，59 个共享，max 4 场景/mapId。`mapIdFromSourceNumber` 单测覆盖 id 格式。✅（注：多场景同 mapNum→同 mapId 无独立单测，行为经输出验证——非阻塞）
- **0x99 双站点→mapId**：translate-events.ts:700-705 emit `setSceneMapOverride{mapId}`（resolver mapIdForNum 注入），无 mapNum 泄漏。✅
- **SceneDef 只剩 mapId**：content/index.ts:115-118 `SceneDef.mapId:string`，无 reuseOriginalMap/ownMap/mapNum；projects/pal 全 294 场景 grep 零旧字段。✅
- **MG2 双表**：migration-merge.test.ts:113-150 `/maps` id 合并 + 同 id 冲突；migration-bootstrap.test.ts:45-64 `/maps` 语义路径。✅
- **dry-run 幂等**：`migrate:content` 实测 `writes=0 deletes=0 conflicts=0`，ref-warnings=0。✅

**(4) S1/S2 落地确认 + 体积门禁复算** ✅
- **S1**：migration-baseline.ts:62 `isAtomicProjectMapPath` 跳过正文写入；`_state.json` 含 223×2 map hash 条目，`baselines/pal/content/maps/` 只有 index.json（零 per-map 正文）。merge 走 `sameAtomic`（hash 相等性，migration-plan.ts:80-82）+ `mergeAtomicMapFile`。baseline Git 负重从 ~48MiB 降至零。✅
- **S2**：project-map.ts:11 `heights?` 可选；guard :107-108 flat 层不要求 heights，:113-121 缺失=全零、flat 层非零高度 throw；normalize :129-133 输出省略 flat 层 heights。project-map.test.ts:71-86 覆盖。✅
- **体积门禁**：sizeRatio 0.487759 < 1.25，远低于上限。源 102.7MiB → V2 50.1MiB。✅

**(5) M2/M3/M4 落地确认** ✅
- **M2**（旧数字 mapOverride 拒载）：`reforge/src/save/ops.ts:70-73` 对数字 mapOverride throw（"旧存档…数字地图编号 N，无法安全转换"）。ops.test.ts:75-93 回归测试。**复验时发现历史锚点曾误写为 `editor/src/core/save/ops.ts:65-72`，当前卡已统一修正为 `reforge/src/save/ops.ts:64-79`。**
- **M3**（undo pin）：edit-session.test.ts:151 "干净地图可淘汰；撤销链触及图保存后仍 pin，切图后可 undo"；project-io.test.ts:195 "未加载图 copy-through 不 parse"。✅
- **M4**（格式化器单一来源）：`formatProjectMapV2` 定义在 content/project-map.ts:166-189，migrate + editor 均从 `@type-pal/content` import。copy-through 字节相同测试 project-io.test.ts:195。✅

**(6) ProjectMapV2 schema guard 测试覆盖** ✅
- 自洽 guard（矩阵尺寸/layer id 唯一/非负高度/null tile height=0/flat 层全零）：project-map.test.ts 全覆盖。
- 交叉引用 guard（未知 tilesetId/未知 mapId）：migration-validate.ts:116,121-125 + project-io.ts:142-144 实现，经 integration 覆盖（无独立单测——非阻塞）。

**非阻塞观察（不影响 accept）**：
- O1：s294 stub 排除分支无独立单测（integration 覆盖）。
- O2：共享 mapNum→同 mapId dedup 无独立单测（输出验证）。
- O3：交叉引用 guard（tilesetId/mapId）无独立单测（integration 覆盖）。
- O4：卡内 M2 历史锚点曾误写为 editor 路径，收口时已修正为 reforge 路径。
- 以上四项均属"行为已验证、独立单测缺失"，不改变 accept 结论。

**总结**：M1 审计可复现且 ad-hoc 数字已替换；静态门禁三模式零命中；迁移覆盖矩阵零漏项（223/294/s294/共享/0x99/MG2/幂等全验证）；S1/S2/M2/M3/M4 全落地；体积门禁 0.488 远低于 1.25。**accept**。

## Draft: 设计与风险

### 1. 唯一作者态 schema

```ts
interface MapLayerV2 {
  id: string
  name: string
  depthMode: 'flat' | 'height'
  tiles: (number | null)[][]
  heights: number[][]
}

interface ProjectMapV2 {
  version: 2
  width: number
  height: number
  tilesetId: string
  layers: MapLayerV2[]
  collision: number[][]
}

interface MapAssetDefV1 {
  id: string
  name: string
  path: string
}

interface MapIndexV1 {
  version: 1
  maps: MapAssetDefV1[]
}

interface SceneDef {
  mapId: string
  // 其余字段不变
}
```

- 所有矩阵都是 `[2 * height][width]` 的错排菱形 lattice；行奇偶只是几何坐标，不叫旧 `h`。
- `heights[row][col]` 是同位置 `tiles[row][col]` 这次放置的遮挡高度；tile 为 null 时高度必须为 0。
- 高度为非负整数，不继承旧 4 bit 上限。`depthMode='height'` 时，非零高度实例进入角色深度排序；
  `flat` 层高度必须全 0，只铺底。旧两视觉层迁移后都用 `height`，因为原版两层均可能出现非零高度。
- `collision` 与视觉层正交。数值 0 可通行，非 0 为阻挡/未来地形类型。
- `TilesetDef.tiles[].height` 与 `tileHeightsOf()` 退役。瓦片集只提供图像；画笔高度来自编辑器当前高度。
- map index 是发现真值，场景不是索引。地图 id/path/name 分离；改显示名不改变 id/path。
- 工程 contentVersion 升为 2，manifest 必须声明地图索引。reforge/editor 不接受 v1；旧工程只能先走
  migrate 包的一次性升级器，升级器输出 v2 后才可进入编辑器。

### 2. 旧 Tilemap 到 ProjectMapV2 的纯转换

对源 `cells[row][col]` 的 `lower/upper` 分别取 `sub=0/1`，目标 lattice 行
`b = row * 2 + sub`：

```text
d = sub == 0 ? lower : upper
layer-0.tile   = (d & 0xff) | ((d >>> 4) & 0x100)
layer-0.height = (d >>> 8) & 0x0f
layer-1.tile   = (((d >>> 16) & 0xff) | ((d >>> 20) & 0x100)) - 1
layer-1.height = (d >>> 24) & 0x0f
collision      = (d & 0x2000) != 0 ? 1 : 0
```

- layer-1 tile 解出 -1 时写 null，height 强制 0；不得保留 `+1/-1` 编码。
- map id 使用 `map-NNN`，tileset id 使用 `tileset-NNN`；原始数字只在转换函数内部存在。
- 全部 223 张源图均产出，包括未引用图；源场景共享 mapNum 时复用同一个 map id。
- `s294` 只按精确 stub 签名排除并写审计记录；不生成虚假 map-000/tileset-000。
- 0x99 在 translate 阶段调用同一个 mapNum→mapId resolver，产出
  `setSceneMapOverride { scene?, mapId }`。world override、reload host 和存档随之改为 string id。

### 3. 单格式加载与编辑仓库

- `LegacyTilemap` 类型仅允许 pal-extract、phase1 game 和 migrate converter 引用；reforge/content/editor
  的公开类型和实现都不能 import 它。
- 引擎加载 map index 元数据，按当前场景 mapId 读取一张 `ProjectMapV2`，继续使用有界 LRU。
- 编辑器先加载地图目录，不加载所有正文。选择地图时由 `MapDocumentStore` 异步 hydrate；hydrate 不是
  作者操作，不进入 undo 栈。编辑 Command 只作用于已加载文档，仍用不可变 apply/invert。
- 脏地图在保存或明确放弃前不可被 LRU 淘汰。未加载且未改的地图在保存、clone、zip 时从项目源
  copy-through；新建、删除、改名和换绑由目录与文件变更集记录。
- PAL HTTP 工程和 FSA 本地工程共用同一 repository 接口，不建立两套 schema/状态机。

### 4. 地图库、场景绑定与聚焦导航

- 地图模块左栏为 map index 列表，支持搜索、新建、复制、改显示名、删除和使用场景计数。
- 场景检查器只显示稳定 map 选择器，提供打开地图、创建并绑定、复制并绑定；没有“复用原版”选项。
- 图层列表继续负责增删、重排、命名和 `depthMode`；图层导航尺只负责快速选择当前绘制层与聚焦。
- 画布边缘放两条紧凑竖向导航尺：图层尺按 z 顺序列刻度，高度尺按当前地图实际高度范围列刻度。
  支持拖动、点击和滚轮；使用统一 CSS 手柄与图标视觉。
- 当前图层、当前高度匹配的瓦片按正常亮度绘制，其余瓦片统一降低至约 25% 亮度；两个焦点同时启用时
  取交集。临时“显示全部”只关闭变暗，不改变当前绘制层/高度。
- 高度尺当前值同时是新笔触写入的实例高度；吸管读取 tileId、layerId 和 height 后同步两条导航尺。
- 聚焦、显隐、缩放和导航位置只属编辑器视图状态，不序列化到 ProjectMapV2。

### 5. 迁移合并、体积与确定性

- `content/maps/index.json#/maps` 在 migration-merge 与 migration-bootstrap 两处按 id 合并。
- 单张 `content/maps/<id>.json` 使用现有原子三方规则：theirs 未变则保 ours，ours 未变则收 theirs，
  双方变化报告冲突。地图矩阵不做猜测式逐格自动合并。
- map 文件使用确定性专用格式化器：对象结构缩进，矩阵每行压成一行；既可按行 diff，又避免默认
  pretty 的 230 MiB 膨胀。格式化器往返必须保持 JSON 语义和字节幂等。
- migration file set 可为大地图保存预序列化文本/惰性 artifact，禁止同时长期保留旧图对象、dense
  V2 对象和 pretty 字符串三份副本。构建与合并按单图处理，控制峰值内存。
- 基线与项目均管理每张地图；第二次同源迁移必须严格零写入、零删除、零冲突。

### 6. 实施分期

1. **F1 契约与转换器**：ProjectMapV2、MapIndex、tileset 修正、纯转换公式、全源审计与体积格式化器。
2. **F2 迁移输出与 MG2**：223 图、294 场景、0x99、baseline/merge/bootstrap、双跑幂等。
3. **F3 reforge 单格式**：删除 Tilemap 分支，统一 renderer/collision/loader/cache/world override。
4. **F4 editor repository/core**：map index、懒加载、copy-through、Command/undo、CRUD/换绑、clone/zip。
5. **F5 editor UI**：地图库与场景绑定收口，图层尺、高度尺、组合聚焦、吸管/画笔闭环。
6. **F6 集成与清债**：静态边界门禁、全仓测试、三档浏览器、跨场景/0x99、文档与旧代码删除。

F1-F6 由同一 Coding Owner 连续推进；任一期不得以兼容分支把半成品暴露给 editor/reforge。

### 已知风险

- 风险: W7D 的 tileset 高度错误已进入 renderer/editor 多处。
  - 缓解: 删除 helper 后用 typecheck 暴露消费方；静态门禁禁止 tileId→height 回流。
- 风险: 223 张 dense 地图导致磁盘、迁移内存和编辑器启动膨胀。
  - 缓解: 行紧凑序列化、单图 artifact、目录先行、按需加载、脏文档 pin 和明确体积门禁。
- 风险: 旧 W7E 未提交实现范围大，容易选择性保留时把 legacy 分支一起带回。
  - 缓解: 以 F6 静态零命中为门禁；按新契约逐文件审，不以“测试已绿”判可复用。
- 风险: map override、共享地图和未引用地图在只按场景扫描时漏迁。
  - 缓解: 以 tilemap 目录为全集，场景/脚本只做引用；全量引用闭包审计。
- 风险: editor lazy store 与全局 undo/save/zip 交互复杂，可能丢未加载或脏文件。
  - 缓解: repository 状态机测试 + copy-through 集成测试 + FSA 临时目录真实保存重开。
- 风险: 两条竖向导航尺在窄屏挤压画布或与可调面板手柄冲突。
  - 缓解: 固定窄轨、稳定尺寸、可折叠；1280/900/720 截图和命中区检查。

### 主审立场

- Reviewer: Opus 主审架构/schema/懒加载/MG2；GLM 主审迁移覆盖、全量审计、体积与测试矩阵。
- 结论: **Opus agree(2026-07-14)**。七点逐项:
  1. **schema** — 通过。heights 与 tiles 同层平行矩阵 = 实例高度;collision 正交;`TilesetDef.tiles[].height` 退役+静态门禁封回流;flat/height 双模式 + "null tile 高度必 0" guard;不继承 4bit 上限正确(作者态不受原版编码束缚)。
  2. **转换无损** — 公式逐位核实与现行 render/collision 一致;但"无损"目前是抽样命题。**M1:升级为全量定理**——F1 审计必须含 (a) 全 223 图未映射位残差扫描(bits 14-15/29-31,非零即 fail-loud 并落审计;map1 抽验 16,384 子格全零,可行性已证),(b) 空 top tile 携非零高度位的计数(有则文档化丢弃),(c) **全图 V2→重编码==源 的往返等式审计**(线性扫描,便宜),不以"采样对照"代替。
  3. **闭环** — s294 精确签名排除+fail-loud ✓;全集以 tilemap 目录为准(map104/164 天然入库)✓;0x99 双站点→resolver→`setSceneMapOverride{mapId}` ✓。**M2:旧存档策略补一句**——现存 X1/dev 存档的 world mapOverride 是数字,contentVersion 2 下按版本拒载或显式迁移,写明,禁静默错型。
  4. **懒加载编辑仓库** — hydrate 不入 undo ✓/脏 pin ✓/copy-through ✓ 架构正确。**M3:补"保存后淘汰再 undo"洞**——地图 A 编辑→保存(变净)→LRU 淘汰→用户 undo,invert 需要文档在场。三选一写死:undo 栈引用的文档禁淘汰 / 命令自带逆快照 / 保存清撤销历史;并加状态机测试。
  5. **MG2** — index 按 id 双表 ✓;单图原子三方(不逐格猜)✓ 正确保护作者改动。
  6. **体积** — 行紧凑格式化器+1.25× 门禁+禁单体 ✓。**M4:格式化器单一来源**——迁移器与编辑器保存必须共用同一实现,并加"编辑器保存未改地图=字节相同"测试;否则首次编辑器保存即产生全文件格式 diff,MG2 会把 223 张图全部视为 ours 改动。
  7. **导航交互** — 双尺/变暗/交集/显示全部/吸管回写闭环完整。**M5 三个交互边界**:(a) 高度尺必须允许选超出当前图已有最大值的高度(否则永远无法引入新高度层级——"按实际高度范围列刻度"是死循环),给 max+1 档或数值输入;(b) flat 层被选为绘制层且当前高度>0 时的笔刷语义写明(禁写高度并提示/引导切 depthMode),防与"flat 全零"guard 冲突;(c) 图层列表与图层导航尺共享同一 currentLayerId 状态(两个视图一个真值),防双选择漂移。
- 建议(非必改,GLM/Codex 权衡):
  - **S1**: map 文件在 MG2 baseline 以 hash 记录即可——原子合并单元只需相等性判定(_state.json 已有 per-file sha256),完整值仅服务字段级合并;可省 baseline ~48MiB Git 负重,冲突报告以三方 hash+文件路径呈现。
  - **S2**: flat 层可允许省略 heights 矩阵(guard 视缺席=全零),迁移图不受影响,作者纯铺底层省一半字节。
- 必改项: M1-M5(如上,均为设计补明,非架构推翻)。
- 是否建议进入 build: **待 Codex 把 M1-M5 落进 Draft + GLM 签字后 build**。

### 三方争议记录

- Codex: 选择单一 ProjectMapV2、dense 实例高度矩阵、稳定 id、迁移期全量产图和下游零 legacy。
- Opus: 方向全面同意(单格式/实例高度/全量迁移/懒加载/原子合并均正确);M1-M5 是把"无损/懒加载×undo/格式化器/导航边界"从口头承诺变成可验收条款,非对抗立场。W7D"高度属瓦片"结论的推翻有 map1 单图 70 个多高度 tileId 的独立实证。
- GLM: **agree**。迁移覆盖矩阵零漏项(223/294/59/104/164/0x99 全独立实测);体积 47.8MiB 需 F1 落可复现脚本(非阻塞);M1 三项审计可操作,但**卡内 map1"70"不可复现(实测 90)→ M1 审计脚本必须用脚本输出替换 ad-hoc 数字**,定性结论不变;S1(baseline hash 化省 48MiB)采纳——_state.json 已有 per-file sha256;S2(flat 层 heights 可省略)采纳;静态门禁 grep 口径可执行(当前下游 Tilemap/reuseOriginalMap/cell.lower-upper/word 解码命中点即迁移删除清单)。N1(锚点 700→698)/N2(0x99 均 0xFFFF 当前场景)/N3(165 与 164 对称)非阻塞。
- 用户拍板: 旧格式只许存在于迁移前；高度是格子实例；编辑器需要图层/高度聚焦导航。

## 额度 / 代班记录

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: `packages/content`、`packages/migrate`、`packages/reforge`、`packages/editor`、
  `projects/{pal,demo,e2e-own}`、迁移 baseline 与本卡列出的第二阶段活文档。
- 实现摘要:
  - content 新增唯一 `ProjectMapV2`、`MapIndexV1`、确定性行紧凑格式化器；SceneDef 只留
    `mapId`，tileset 删除 per-tile 高度，OwnMap/ReuseMap 退役。
  - migrate 全量转换 223 图和 294 个有效场景，精确排除 s294 stub；0x99 解析成稳定 map id；
    map index、tileset、MG2 hash baseline/原子合并与全量审计接通。
  - reforge 仅消费 ProjectMapV2，地图按 id 懒加载；渲染、遮挡、碰撞、world override 和存档接口
    不再接收旧 word/mapNum。
  - editor 启动只读 map index，正文按需 hydrate；干净地图 LRU，脏地图和 undo 引用地图 pin；
    未加载地图保存/clone/ZIP 原始字节 copy-through。地图 CRUD、场景换绑、N 层/实例高度绘制、
    图层与高度组合聚焦、吸管和撤销闭环完成。
  - demo、e2e-own、pal 均升级到同一地图模型；删除下游旧地图模块和双格式测试。
- 运行命令:
  - `pnpm --filter @type-pal/content check`：18 files / 172 tests 通过。
  - `pnpm --filter @type-pal/reforge check`：36 files / 329 tests 通过。
  - `pnpm --filter @type-pal/editor check`：18 files / 163 tests 通过。
  - `pnpm --filter @type-pal/migrate check`：22 files / 156 passed / 1 skipped。
  - `pnpm --filter @type-pal/migrate audit:maps`：223 图、3,653,632 实例、语义往返差异 0、
    V2/source 字节比 0.487759。
  - PAL 迁移 dry-run：`writes=0 deletes=0 conflicts=0`，引用/脚本问题均为 0。
  - 根 `pnpm check`：shared/content/reforge/game/pal-extract/migrate/editor 全绿。
  - `pnpm lint`、editor production build、下游 legacy 静态零命中门禁通过。
- 浏览器 / 手工检查: 见“视觉验证记录”；另在真实 UI 完成地图 CRUD、场景换绑与打开地图。
- 跳过的检查及原因: 无。内置浏览器插件发生运行时连接兼容错误，改用仓库 `@playwright/test`
  的 Chromium 完成同等真实页面、截图、控制台和画布像素验证。

### Build 准入定案（2026-07-14）

- M1：F1 新增可复现全量审计，输出残差位、空 top 高度、实例高度分布、碰撞计数、格式化字节；
  全 223 图执行 V2 语义字段往返。实测发现 4 个原引擎从不读取的残差 word、3 个“空 top tile +
  孤立高度”word；它们不影响像素/遮挡/碰撞，规范化后 raw word 有 6 处不同，但所有被原引擎消费的
  tile/有效实例高度/collision 字段 3,653,632 处全部相等。具体位置由审计报告固定，不向新版 schema
  泄漏无效 packed bits。卡内 ad-hoc 数字以脚本结果替换。
- M2：`normalizePayload` 在读档边界校验 `world.script.mapOverride`；合法稳定 map id 原样保留，
  旧数字地图编号给出明确不兼容错误，不静默猜成 map id。两条回归测试固定此边界。
- M3：undo/redo 栈仍引用某地图的命令时，该地图文档禁止被 LRU 淘汰；保存不清空撤销历史，并有
  “编辑→保存→切图→undo”状态机测试。
- M4：地图行紧凑格式化器放在 content 公共包，迁移器与编辑器保存共用；未改地图经编辑器保存后
  字节必须完全一致。
- M5：高度尺提供 `max + 1` 刻度及数值输入；flat 层当前高度大于 0 时禁止落笔并引导切换
  `depthMode='height'`；图层列表与图层尺共享唯一 `currentLayerId`。
- S1：采纳 baseline hash 化；原子 map baseline 不复制完整正文，冲突以路径与三方 hash 报告。
- S2：采纳 flat 层省略 heights；加载后语义为全零，序列化保持省略。

### F1 审计发现（2026-07-14）

- `pnpm --filter @type-pal/migrate audit:maps` 已扫描 223 图、3,653,632 个 lattice 实例。
- 可信统计：layer0 非零高度 120,910；layer1 非零高度 83,253；碰撞 168,197；多高度
  `(tileset,layer,tileId)` 14,148；序列化比率 0.487759，低于 1.25 门禁。
- 源异常：残差位 4 处（map 133/188/195）；空 top tile 携孤立高度 3 处（map 77/133）；二者有
  1 处重叠，因此 raw word 规范化差异为 6。`reference/sdlpal/map.c` 只消费 tile id、高度和 bit13，
  且 `scene.c` 仅在 top bitmap 非空时使用 top height；这些值在原版均无可观察语义。
- 结论：新版不保留原引擎从不读取的残差位，也不允许 null tile 携高度；审计改为“所有可观察字段
  逐实例全等 + 原始异常显式列举”。这是源数据事实修正，不新增兼容字段。

## 视觉验证记录

- Visual Verification Owner: Codex
- 验证方式: 本地 editor dev server + Playwright Chromium；逐张查看截图，并从主画布读取像素、
  DOM 边界、控件状态与控制台错误。
- 截图 / 像素检查路径: `/tmp/w7f-map-fixed-{1280,900,720}.png`、
  `/tmp/w7f-map-164-1280.png`；临时二进制证据不写入仓库。
- 结论:
  - 1280/900/720 三档均 `scrollWidth == viewportWidth`；toolbar、viewport、双导航尺完全落在
    center 内，导航尺与左右面板手柄重叠面积均为 0。实测曾发现窄屏 center 隐式列被工具栏撑宽，
    已以 `grid-template-columns: minmax(0, 1fr)` 修复后复验。
  - 三档画布采样非黑分别为 1036/1083、351/395、342/367；map-104 与 map-164 均能从列表
    懒加载并绘制，页面与控制台零错误。
  - 关闭/开启组合聚焦时画布校验和由 1,358,029 变为 1,668,230，证明非目标瓦片明暗确实变化；
    图层/高度滑块、滚轮值、吸管读取后回到笔刷均通过；map-104 高度尺实测提供 `0–15`
    共 16 档，地图现有高度之外仍可继续绘制，控制台零错误。
  - 迁移地图的复制/改名/删除按钮和笔刷可用；新建→改名→复制→二次确认删除通过。
    s000 地图选择器列出 223 图，可从 map-020 换绑 map-104 并跳转地图模块。
  - demo 的 map-056 与 e2e-own 的 start 均以 ProjectMapV2 打开、画布非空、控制台零错误。
- 未完成项: 无。Opus 已完成开场到 s003 的前台运行时复验及两个 0x99 站点检查。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: Codex、Opus、GLM 均签 accept；实现、运行时、视觉、迁移覆盖与测试矩阵复验通过。
- 必须返工项: 无。O1-O4 为非阻塞观察，其中 O4 已在本次收口修正。
- Accept / rework: accept

## 用户验收

- 用户结论: 2026-07-14 用户确认三方审查签字齐，采纳三贤人审查结论，验收通过。
- 后续任务: 清理事件 `unmigrated` 兼容解释器；统一精灵/音乐/音效资产身份；工程资源自包含。

## 交接日志

- 2026-07-14 User: 否决 Tilemap/OwnMap 下游并行；要求迁移后只有新版地图，高度归格子实例，
  地图编辑器增加图层/高度导航尺。Evidence: 当前会话。Next: Codex 重做设计。
- 2026-07-14 Codex: 取消 W7E 旧方案，完成源数据/消费方审计并起草 W7F。Evidence: 本卡上下文锚点、
  转换公式、验收矩阵。Next: Opus 设计压力测试；不得实现。
- 2026-07-14 Opus: 设计主审签 **agree + M1-M5 必改 + S1-S2 建议**。地面核验:公式与 render.ts 逐位一致/223 图/s294 精确 stub/0x99=2/map1 70 个多高度 tileId(实例高度铁证)/map1 残差位全零。M1=无损全量定理化(残差扫描+空top带高度计数+往返等式);M2=旧存档数字 override 策略;M3=懒加载×undo 的"保存后淘汰再 undo"洞;M4=格式化器 migrate/editor 单一来源+字节相同测试;M5=高度尺可超范围/flat 层笔刷语义/currentLayer 单真值。S1=原子图 baseline hash 化省 48MiB;S2=flat 层 heights 可省略。Evidence: 主审立场七条。Next: Codex 落 M1-M5;GLM 复核迁移覆盖/体积/测试矩阵;三签齐 build。未改实现文件。
- 2026-07-14 GLM: 设计复核签 **agree**。五项独立实测：(1)迁移覆盖矩阵零漏项——223 源图/295场景(294有效,s294精确stub)/59图共享(max4)/map104+164未直接引用(164仅0x99)/0x99恰2站(scene-230→164,scene-243→165);(2)体积口径——源102.7MiB实测吻合,但47.8MiB/子格计数无脚本复现,F1必落可复现审计脚本(非阻塞);(3)M1可操作——全图线性扫描秒级,但**map1"70"实测90不可复现**,M1脚本必须替换卡内ad-hoc数字;(4)S1采纳(_state.json已有per-file sha256)+S2采纳(flat层heights可省);(5)静态门禁grep可执行(命中点即删除清单)。N1-N3非阻塞。Evidence: 设计签字 GLM 行。Next: Codex 落 M1-M5 + M1数据证据补落 + S1/S2;三签齐已 build allowed。未改实现文件。
- 2026-07-14 Codex: 核对三签与用户“齐了”确认后进入 build；M1-M5 与 S1/S2 的实现选择已写入 Build
  准入定案。Evidence: 本卡签字表、Build 准入定案。Next: F1 契约与转换器。
- 2026-07-14 Codex: 完成 F1 内容契约与首轮全量审计；content 172 tests 全绿，223 图逐实例审计
  发现 4 个无效残差 word 与 3 个空 top 孤立高度，所有原引擎可观察字段往返为零差异；V2 字节比
  0.487759。Evidence: `project-map.ts`、`project-map-converter.ts`、`project-map-audit.ts` 与审计命令。
  Next: F2 迁移产物与 MG2。
- 2026-07-14 Codex: 完成 F2-F6：迁移/MG2、reforge 单格式、editor 懒仓库与 UI、三工程升级、
  全仓门禁和浏览器实测全部收口，任务转 review。Evidence: Build 与视觉验证记录。Next: Opus
  独立复验实现可行性、运行时/存档边界和视觉交互；不得直接改实现文件。

- 2026-07-14 Opus: 实现主审签 **accept**(c2589fb2)。五点:静态边界零命中/M2 数字 override fail-loud(save/ops.ts:72)/M3 undo-pin+copy-through 双测试/0x99 双站点+6051 前台运行时(开场→s003,console 零错)/6010 地图库+双尺+超范围高度输入(M5a 落地)。M1 往返审计失败即抛、M4 格式化器单一来源+字节幂等均实锤。方法学:后台标签 rAF 节流伪装 1fps 假回归(前台 119.5fps),CLI 验证必须 bringToFront——M3 期同症同因,已归档。Evidence: done 签字行。Next: GLM 迁移覆盖/测试矩阵复核;三签齐+用户验收方可 done。未改实现文件。
- 2026-07-14 GLM: done 前覆盖复验签 **accept**(c2589fb2 + 8add57a5)。六项独立实测+全包复跑(content 172/reforge 329/editor 163/migrate 156+1skip = 820 pass)：(1)M1 审计独立实跑 223/3,653,632/0diff/0.488 逐位匹配，ad-hoc 数字已由 F1 替换（多高度 14,148）；(2)静态门禁 Tilemap/reuseOriginalMap/cell.lower-upper 三模式 grep 零命中；(3)迁移覆盖零漏项——223图+index/294场景无s294/59图共享/0x99→mapId/SceneDef只mapId/MG2双表/dry-run幂等writes=0；(4)S1(baseline hash 化，_state.json 223×2 hash 条目，零正文)+S2(flat层heights可省)+体积0.488<1.25；(5)M2(reforge/save/ops.ts:70 throw)/M3(undo pin edit-session.test:151)/M4(formatProjectMapV2单一来源)全落地；(6)ProjectMapV2 guard 自洽全覆盖。O1-O4 非阻塞(s294 stub/共享dedup/交叉引用guard无独立单测+卡内M2锚点editor→reforge路径有误)。Evidence: done 准入 GLM 复验段。Next: 交用户验收，用户点头方 done。未改实现文件。
- 2026-07-14 User: 确认 Codex、Opus、GLM 三方 done 前签字齐。Evidence: 当前会话。Next: Codex 收口任务卡与看板。
- 2026-07-14 Codex: 按三方 accept 与用户确认将 W7F 转 done，修正历史 M2 锚点说明并移出进行中看板。Evidence: done 签字表、Review、用户验收。Next: 无，任务完成。

## 下一位 Agent 提示词

```text
无下一位 Agent 提示词。W7F 已三方 accept 并经用户验收，任务完成；后续工作另开任务。
```
