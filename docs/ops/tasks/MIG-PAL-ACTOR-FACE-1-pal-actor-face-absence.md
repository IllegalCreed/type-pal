# MIG-PAL-ACTOR-FACE-1 - PAL 角色小头像缺席语义与迁移收口

Status: draft
Phase: phase2
Capability: A7
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: TBD

## 目标

修正 PAL 迁移器把盖罗娇的全透明占位帧登记成有效战斗/菜单小头像的问题。重迁后只有真实拥有
小头像的五名角色声明 `ActorDef.face`；盖罗娇不声明 `face`，编辑器角色列表与 Hero 自动走可战斗角色
通用人物占位，运行时不预载或绘制伪资源。

## 范围

- 范围内:
  - 把 PAL “哪些 roleId 真正拥有小头像”的事实收敛到迁移共享事实层，避免资源生成和 Actor 映射各自推断。
  - 静态图迁移只生成 frame 48..52 对应的五张 `face`，不生成/登记 frame 53。
  - `mapActor` 只为拥有真实小头像的角色写 `face`；保留盖罗娇的 `portraits.default` 对话立绘。
  - 更新静态图引用审计、迁移 baseline、相关测试与 PAL 生成产物，并清理失去 catalog 所有权的旧 PNG。
  - 增加编辑器契约测试：有 `portraits.default` 但无 `face` 的可战斗角色仍使用通用人物占位。
- 范围外:
  - 不新增盖罗娇美术资源，不把对话立绘缩放成战斗/菜单小头像。
  - 不改变 `ActorDef` schema；`face?: AssetId` 的缺席语义已经存在。
  - 不改变第一阶段游戏的原版画面，也不为 Reforge 运行时新增通用 emoji。
- 明确不做:
  - 不在 Editor/Runtime 按尺寸、字节数、透明度、sha256 或角色 id 特判坏资源。
  - 不只手改 `projects/pal` 生成产物。

## 前提真值门

### 一句话行为 / 工程前提

- `DATA.MKF` 的盖罗娇 player-face 槽 frame 53 是全透明占位而非有效小头像；canonical PAL 工程必须以
  `ActorDef.face` 缺席表达该事实，让编辑器执行既有的可战斗角色通用头像兜底。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `SPRITENUM_PLAYERFACE_FIRST=48`，player role 以 `48 + roleId` 取头像；直接读取 `data/raw/DATA.MKF` chunk 9 的 frame 53 得到 3×4、12 像素全透明。 | `reference/sdlpal/ui.h:116`; `reference/sdlpal/uibattle.c:155-160`; 2026-08-22 命令：`openMkf(DATA.MKF) -> readChunk(9) -> parseSpriteChunk()[53]` 输出 `{frames:71,width:3,height:4,opaqueMask:0}` |
| 第一阶段 | 菜单/战斗按同一 `48 + roleId` 消费 UI sprite；盖罗娇没有可显示的小头像，也没有作者工具中的通用占位概念。 | `packages/game/src/present/menu/draw-magic.ts:50,131`; `packages/game/src/present/battle/draw-battle-ui.ts:60,408` |
| 当前二阶段 | schema 已规定 `face` 缺席=刻意无小头像，Editor 已实现 `face -> 图片 / 无 face 的 battler -> 🧑 / NPC -> 👤`；但迁移器对六角色无条件写 `face` 并生成 frame 53，使盖罗娇绕过兜底。 | `packages/content/src/actor.ts:101-121`; `packages/editor/src/ui/ActorMode.tsx:104-130`; `packages/migrate/src/migrate-content.ts:275-294`; `packages/migrate/src/pal-assets.ts:260-267,412-430`; `projects/pal/content/actors.json:1145-1152`; `projects/pal/assets/index.json:6748-6758` |
| 本任务目标 | 迁移共享事实只承认 roleId 0..4 的有效 face；重迁后盖罗娇无 `face`、无 catalog record、无生成文件，Editor 自然显示 🧑。 | 用户 2026-08-22 明确要求“没有小头像，所以应该默认头像兜底”；既有 Editor 契约测试 `packages/editor/src/ui/ActorMode.test.tsx:195-244` |

### 反证与替代解释

- 最强替代解释: frame 53 并非原始空槽，而是 `pal-extract` 或共享 RLE decoder 把有效原图错误解码成透明帧。
- 什么观察会推翻当前前提: 使用独立、原版兼容的 RLE 解码器直接读取 `DATA.MKF` chunk 9，若 frame 53
  出现任一有效不透明像素或可辨识头像，则不能删除该 face，必须转为提取器缺陷。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: Runtime 对可选 face 已安全消费；本缺陷在资源预载之前已经存在。
  - 原版 / 第一阶段理解: `48 + roleId` 的取帧关系由 `ui.h/uibattle.c` 与第一阶段调用点交叉确认。
  - extractor / 地图 / 数据解码: 直接读取 raw MKF 与生成 PNG 均为 3×4 全透明；正式 build 前由至少一位非 Coding Owner 独立核 raw 证据。
  - audit / test model: 当前 frozen census 把错误资源算作 `records=6/edges=6`，它是待纠正的旧基线，不作为反证。

### 用户可见偏离

- 是否主动偏离已核真值: no（修正“无资源却被声明为有资源”的迁移错误，并执行既有编辑器兜底契约）
- `before -> after` 一句话: 盖罗娇列表头像空白 -> 显示可战斗角色通用人物占位。
- 代表场景: 编辑器“角色”页选择盖罗娇，左侧列表与中间 Hero 均不再留空。
- 用户裁决: 2026-08-22 用户已明确要求无小头像时使用默认头像兜底。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md` 铁律 10：迁移问题修上游并全量重迁，禁止单点改 PAL 产物。
  - `AGENTS.md`：migration/asset pipeline 属高风险，必须三方 premise/design 签字后才能 build。
  - `docs/phase2/READ-FIRST.md` 铁律 11：只维护 current canonical 产物，不保留旧 fallback/upgrader。
- 代码锚点(`file:line`):
  - `packages/migrate/src/source-facts.ts:18-26`：六角色稳定 slug / roleId 边界。
  - `packages/migrate/src/pal-assets.ts:260-267,412-430`：错误的六项 face 列表与资源生成。
  - `packages/migrate/src/migrate-content.ts:275-294`：无条件写 Actor face。
  - `packages/content/src/actor.ts:101-121`：对话立绘与战斗小头像是不同语义；face 缺席契约。
  - `packages/editor/src/ui/ActorMode.tsx:104-130`：既有通用占位兜底。
  - `packages/reforge/src/main.ts:410-415,2397-2400,6085-6088`：Runtime 可选 face 消费域。
- 已知坑 / 审计文档:
  - `docs/ops/tasks/A7-2-static-images-engine-chrome.md:193-202` 已冻结 `face?` 缺席语义，但当时错误把 face 数量冻结为 6。
  - `packages/migrate/src/sound-reference-audit.ts:471-495` 当前错误冻结 `records/edges/referenced=6`、`bytes=10_392`。
- 不得重新引入:
  - 不把 `portraits.default` 当作战斗/菜单小头像。
  - 不在运行时或编辑器用文件特征猜“是否为空图”。
  - 不保留 `face.pal.gai-luojiao` 的兼容 alias、fallback 或旧 fixture。
- 相关测试:
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/pal-assets.test.ts`
  - `packages/editor/src/ui/ActorMode.test.tsx`

## 验收条件

- 功能:
  - 盖罗娇迁移结果保留 `portraits.default=portrait.pal.044`，但 `face === undefined`。
  - PAL catalog、binary plan 与落盘目录均不存在 `face.pal.gai-luojiao` / `gai-luojiao.png`。
  - 其余五名角色的 face 稳定 id、字节与显示不变。
  - Editor 列表和 Hero 对盖罗娇显示 battler 通用人物占位；不读取 portrait 充当小头像。
- 测试:
  - focused migrate/editor tests 全绿；静态资源 census 更新为五项并有显式 Gai absence 哨兵。
  - 全量 fresh 迁移成功；产物白名单仅包含本卡预期变化；连续第二次迁移零计划/零 diff。
  - 相关 migrate/editor/reforge typecheck 与测试按实际影响域通过。
- 文档:
  - 修正仍把 PAL face 数量或盖罗娇 face 写成 6/存在的现役任务卡、审计说明和 baseline。
- 视觉 / 手工验证:
  - `?ui_samples=1&module=actor` 或 PAL 评审沙盒中确认盖罗娇左侧列表和 Hero 均显示 🧑，五个真实小头像仍正常。
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:
  - N/A（功能性编辑器界面，开发期做最小视觉验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`DATA.MKF` chunk 9 frame 53 直接解码为 3×4、opaqueMask=0；schema/Editor/迁移调用域证据见真值矩阵）
  - design: agree（共享源事实 -> 资源生成与 Actor 映射 -> fresh PAL 重迁；不在产品层识别坏图）
- Kimi:
  - premise: verified（2026-08-23 本人手工直解 raw：不依 shared decoder，直接读偏移表 slot 53 → 字节
    `03 00 04 00 83 83 83 83` = 宽 3 高 4 + 四条 0x83 纯跳透明指令，12 像素 0 不透明，rawLen=8；
    对照 slot 48-52 均为 36×35/32×32、727-829 不透明像素的真实头像。结论：frame 53 是原版全透明占位，
    非 decoder/extractor 缺陷。另核 `ui.h:116` SPRITENUM_PLAYERFACE_FIRST=48 与 `uibattle.c:155-160`
    的 `48+wPlayerRole` 取帧；`pal-assets.ts:260-267,412-430` 六项无条件生成、`migrate-content.ts:293`
    无条件写 face；`actor.ts:120-121` face 缺席语义已在 schema；`ActorMode.tsx:111-130` 🧑/👤 兜底与
    `ActorMode.test.tsx:203` 契约测试存在；runtime 仅预载显式声明的 face（`main.ts:418-422`）；
    当前产物 `projects/pal` 确有 `face.pal.gai-luojiao`（68B，ref frame-53）且 `portraits.default=
    portrait.pal.044` 保留；frozen census `sound-reference-audit.ts:488-495` 仍冻结 records=6/bytes=10392）
  - design: agree（共享事实层单一“roleId→真实 face”表供 pal-assets 与 mapActor 共用；fresh 重迁一次收口
    ActorDef/catalog/binary plan/PNG/census；Editor/Runtime 主实现不加尺寸/透明度/角色 id 特判，符合铁律
    10/11 与 schema 既有缺席语义）
- GLM:
  - premise: **verified（2026-08-23，本人一手独立解码，非代理；与 Kimi 手工字节证据独立互证）**。
    本人用 node 内联 sdlpal 帧表语义（`palcommon.c:845-851`：`iFrameNum <<= 1; offset = word[N]<<1`，
    即帧 N 读表字 N——字 0 兼作计数与帧 0 偏移的 broken-sprite hack，与仓库 rle.ts
    parseSpriteChunk 的 `getUint16(i*2)` 同约定）自写 RLE 解码器直读 `data/raw/DATA.MKF`
    chunk 9：**帧 48=36×35/727 不透明、49=36×35/802、50=36×35/744、51=32×32/803、
    52=36×35/829（五张真实头像），帧 53=3×4/12 像素/0 不透明**——与 Codex 声明及 Kimi 的
    `03 00 04 00 83 83 83 83` 字节证据三方一致。**排除提取器缺陷**：本人解码不经
    pal-extract 代码路径，独立得到同尺寸同不透明计数；提取链无罪。当前产物 census 复核：
    actors.json 六角色全部带 face（含 gai-luojiao:face.pal.gai-luojiao +
    portraits.default=portrait.pal.044），`PAL_FACE_ACTORS` 六项数组与
    mapActor 无条件写 face 属实。
  - design: **agree（2026-08-23，附必落钉 GF1-GF2，不阻塞准入）**。共享事实层单一来源 →
    资源生成与 mapActor 共用 → fresh 重迁 → census/baseline 更新 → 契约测试——方向正确，
    符合铁律 10（修上游全量重迁）与"不在产品层猜坏图"。
  - **必落钉 GF1-GF2：**
    - **GF1（frame 52/53 表偏移约定写入卡）**：本席解码发现 sdlpal 帧表存在两种读法
      （word[N] vs word[N+1]），两种读法下"五个真实头像"的绝对帧号差 1（word[N] 读法
      为 48-52，word[N+1] 读法为 47-51）；**build 必须以 sdlpal 实现的 word[N] 约定
      （palcommon.c:845-851 实读）为准并在共享事实层注释钉死该约定**，防止后续维护者
      按"直觉"表头偏移改错帧号。本人两种读法都解过：word[N] 下 53=全透明（与 Kimi
      字节证据一致），word[N+1] 下 52/53/54 均为 3×4 全透明——**结论对两种读法均成立
      （roleId 5 槽必为全透明），但帧号引用必须统一**。
    - **GF2（census 哨兵 + 孤儿文件白名单）**：fresh 重迁后的产物白名单必须显式列出
      `gai-luojiao.png` 删除与其 catalog record/binary plan 引用边消失；静态图 census
      从 6→5 的 `records/edges/bytes` 变化逐项入卡；二跑零计划断言含"孤儿 PNG 不复活"。
  - 独立反证：若未来有人用 word[N+1] 约定解码声称"帧 53 是真实头像"，GF1 的约定钉 +
    Kimi 字节证据（`83 83 83 83` 四条纯跳指令）可直接驳回。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi
  - 独立证据锚点: 手工 RLE 解码脚本（2026-08-23，已删）：`data/raw/DATA.MKF` chunk 9 declaredFrames=72，
    slot 53 wordOffset 表项 → 原始 8 字节 `03 00 04 00 83 83 83 83`，逐指令解码 12/12 像素全透明；
    slot 48/49/50/51/52 分别 727/802/744/803/829 不透明像素。`reference/sdlpal/ui.h:116`、
    `reference/sdlpal/uibattle.c:155-160`（原版取帧关系）；`projects/pal/assets/index.json`
    `face.pal.gai-luojiao` record（bytes=68，origin ref `images/ui/frame-53.png`）。
  - 可证伪观察: 若 slot 53 原始字节流中含任一 <0x80 的像素写入指令（即存在不透明像素），前提即被推翻，
    须转提取器缺陷处理——手工解码未见；若 `48+roleId` 不是原版取帧关系（例如存在 per-role face 表），
    共享事实层的 roleId 映射即错误——`ui.h:116`/`uibattle.c:155-160` 与第一阶段消费点排除该解释；
    若 Editor 兜底依赖 face 之外的尺寸/文件特征，`ActorMode.tsx:111-130` 会被证伪——直读确认只按
    `actor.face` 缺席 + `battler` 存在选择 🧑。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. 在迁移共享事实层提供“roleId 是否有真实 player face / 对应 frame”的单一纯函数或只读表；资源生成与
   `mapActor` 必须共用，不再以 `ROLE_SLUGS.entries()` 或“六角色都有”的假设推导。
2. PAL 静态资源生成仅为五个有效 frame 生成 `face` record；`mapActor` 对无 face role 不写字段。
3. 更新 frozen census 与迁移 baseline，执行 full fresh migration，让 catalog/actors/binary 和旧孤儿文件一起
   由生成计划收口；不增加历史兼容分支。
4. Editor/Runtime 主实现不改；仅补契约测试，证明当前可选 face 数据模型能自然闭环。

### 已知风险

- 风险: 误把 extractor 缺陷当原始空槽，删除本应存在的资源。
- 缓解: Kimi/GLM 至少一方必须独立直接解 raw `DATA.MKF` chunk 9 frame 53，并写回像素证据。
- 风险: 更新 census 时遗漏引用边或遗留孤儿 PNG，导致 fresh/merge 两种迁移结果不同。
- 缓解: 同时钉 catalog、actor、binary、落盘文件与二次零计划；审查白名单而非只看测试绿。
- 风险: 把 68×101 对话立绘错当小头像兜底，破坏列表密度与语义。
- 缓解: Editor test 明确 portrait 存在但 face 缺席仍走 🧑。

### 主审立场

- Reviewer: GLM（数据迁移/测试矩阵主审；Kimi 补架构与端到端消费域）
- 结论: Kimi agree（2026-08-23，手工 raw 解码 + 全调用域直读）；GLM pending
- 必改项: 无。build 期关注项（非门禁）: ①更新 frozen census 时把 face 段改为 records=5 并加 Gai absence
  哨兵（卡内已列）；②确认 binary plan 删除 `face.pal.gai-luojiao` 后旧 PNG 由生成计划清理而非手工 rm；
  ③`ROLE_SLUGS` 六角色表保持不变，新事实表只回答“有无真实 face”，不得顺手把 roleId 3/4 名字对调知识复制第二份。
- 是否建议进入 build: 是（待 GLM 签字）

### 三方争议记录(按需)

- Codex: 修上游共享事实并重迁；Editor/Runtime 不加特判。
- Kimi: 同意。补充：本卡前提的关键证据是 raw 层（8 字节纯跳透明指令流），已排除 decoder 缺陷这一最强
  替代解释；消费域（runtime 预载、Editor 兜底、schema 缺席语义）均为可选安全，无需任何产品层特判。
- GLM: premise verified + design agree（2026-08-23，附 GF1-GF2；独立解码与 Kimi 字节证据互证）
- 用户拍板: 用户已确认“没有小头像应默认头像兜底”；其余 pending。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 资源生成记录(如适用)

- Generation Owner: N/A（删除错误迁移产物，不生成新美术）
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: PAL 评审沙盒角色页最小 smoke。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 2026-08-22 已确认期望：无小头像时默认头像兜底；实现验收 pending。
- 后续任务: pending

## 交接日志

- 2026-08-22 Codex: 从 Editor 空白追到 PAL 迁移上游；直接解 raw `DATA.MKF` 证明 frame 53 为
  3×4 全透明，确认 Editor fallback 本身正确。Evidence: 真值矩阵。Next: Kimi/GLM 独立核真并签 build。
- 2026-08-23 GLM（数据迁移/测试矩阵主审）: 独立解码完成并签 **premise verified + design agree
  （附 GF1-GF2）**。自写 sdlpal word[N] 约定 RLE 解码器直读 raw：帧 48-52 真实（727-829 不透明）、
  帧 53=3×4/0 不透明——三方独立一致，提取链无罪。GF1 钉帧表两种读法约定歧义（roleId 5 槽
  全透明对两种读法均成立，帧号引用必须统一）；GF2 钉 census 哨兵与孤儿文件白名单。
  未改实现文件，未代签 Kimi，未改 build 准入结论。
- 2026-08-23 Kimi: 独立手工直解 raw DATA.MKF chunk 9 slot 53（偏移表 + 逐指令，不经 shared decoder），
  确认 3×4 全透明占位为原版事实；核 ui.h/uibattle.c 取帧关系、迁移两处无条件生成点、schema 缺席语义、
  Editor 兜底与 runtime 可选预载。签 premise verified / design agree，完成独立反证审查。未修改实现。
  Next: GLM 做 raw 数据复核、迁移覆盖与测试矩阵审查并签字。

## 下一位 Agent 提示词

```text
接手任务: MIG-PAL-ACTOR-FACE-1 - PAL 角色小头像缺席语义与迁移收口
任务卡: docs/ops/tasks/MIG-PAL-ACTOR-FACE-1-pal-actor-face-absence.md
当前状态: draft
你的角色: Kimi 做架构/消费域独立审查；GLM 做 raw 数据/迁移覆盖/测试矩阵独立审查
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡及其“上下文锚点”
已完成: Codex 已从 data/raw/DATA.MKF chunk 9 直接解出 frame 53=3×4、12 像素全透明，并定位迁移器无条件生成 face 的根因；尚未修改实现。
请你做: 必须亲自读取一手证据，分别写回带证据的 premise verified/counter 与 design agree/counter；至少一方记录独立 raw 解码锚点和可证伪观察。
不要做: 签字齐之前不得开始实现；不要只改 projects/pal；不要在 Editor/Runtime 加透明度、尺寸、字节数或角色 id 特判。
输出要求: 更新任务卡推进签字、主审/争议记录和 build 准入结论；若 counter，写清替代根因与需要补的证据。
```
