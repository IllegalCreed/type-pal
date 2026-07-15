# A7-0 - 工程资源闭包地基与音乐注册表首切片

Status: draft
Phase: phase2
Capability: A7 / R3 / R7 / W5 / X2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: current

## 目标

建立全工程唯一的 `AssetId -> AssetRecord -> FileSource` 资源链,并用音乐/MIDI 音色库完成第一个纵向切片:
PAL 和空白工程的音乐引用、编辑、试听、运行、保存与重迁不再依赖数字号拼文件名或应用根 `fetch`；
`content/music.json` 退役,作者替换资源不会被下一次迁移覆盖。该切片只完成 A7 地基与音乐族,不冒充全资源闭包完成。

## 范围

- 范围内:
  - `@type-pal/content` 新增 AssetId、AssetKind、AssetCatalogV1、具名运行角色、严格路径校验和音乐引用 walker。
  - manifest `contentVersion: 3` 迁移期形态:`assets.catalog/roles` 承载新资源族；未迁移资源族集中进
    `assets.legacy` 债务区。提供 v2 -> v3 项目迁移,运行时内部不保留 v2 双轨。
  - `@type-pal/reforge` 新增只经 `FileSource` 读取的 AssetResolver；移除音乐裸 fetch、数字补零路径和 soundfont 应用根读取。
  - 音乐 schema 改为 AssetId/null/显式 `stopMusic`；持久当前曲改到 typed `WorldState.audio`,移除 `sys:music`。
  - PAL 迁移生成音乐与 soundfont 资源记录、物化工程内文件、改写全部音乐引用并删除 `content/music.json`。
  - 编辑器音乐页从 catalog 派生,完成 MIDI 导入、改名、替换、引用保护删除、试听、保存重开闭环。
  - A7 闭包检查地基:引用存在、kind、规范路径、文件存在、bytes、SHA-256、未引用 warning；输出全量剩余缺口。
  - MG2 对 `assets/migrated/**` 与 `assets/authored/**` 分所有权,保护同 AssetId 的作者替换。
- 范围外:
  - SFX、头像、图标、UI、字形、颜色表、瓦片、精灵、战斗/法术资源、RNG、视频的实际迁移；后续 A7-1..A7-3。
  - A7-4 克隆/另存/zip 全量闭包改造、legacy 归零、v3 -> v4 收口与“断开外部目录仍完整运行”最终验收。
  - OGG/流媒体音乐后端；本切片只保证当前 MIDI + soundfont 链。
  - ED-3 全内容引用图；本卡只产出可被 ED-3 复用的资产引用边。
- 明确不做:
  - 不保留同一音乐引用的 number/string、`musicId/music`、AssetId/path 两套长期字段。
  - 不用 `0` 伪装停曲资源,不让 AssetId 推导文件名,不接受绝对路径或 URL 作为工程资源。
  - 不把完整 200MB 二进制塞进 JSON baseline 或本提交；受保护迁移字节保持本地可再生。
  - 不更新 capability-map 为 A7/R7 done；A7-0 完成后全量闭包仍应如实报告其他资源族缺口。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`:资产管线、schema、跨包公共接口必须三签；数据迁移缺陷必须先修上游并重生成。
  - `docs/phase2/READ-FIRST.md:15`:对象、引用、状态键使用稳定 id,不得把数组位置/数字下标当身份。
  - `docs/phase2/READ-FIRST.md:11-14`:新架构只保留一套干净运行模型,不靠兼容层和隐式全局槽。
  - `docs/phase2/editor/project-lifecycle-design.md:18-35`:一个工程文件夹包含整个游戏的全部资源,克隆后零服务器依赖。
  - `docs/phase2/editor/project-lifecycle-design.md:47-69`:内容与素材统一走 FileSource,blob URL 生命周期必须受管理。
  - `docs/phase2/roadmap.md:173,177,224-230`:A7 资源闭包、R7 稳定注册表及其先于大规模 Q1 E2E 的依赖顺序。
- 代码锚点(`file:line`):
  - `packages/content/src/character.ts:59-84`:LoadedManifest.assets 仍是目录约定并允许绝对路径。
  - `packages/content/src/index.ts:18-26,119-133`:MusicDef 是数字壳；场景/战斗音乐仍是 number。
  - `packages/content/src/script.ts:129-156`:playMusic/playSound/startBattle.musicId 的数字 schema。
  - `packages/reforge/src/file-source.ts:4-18`:绝对路径绕过工程根。
  - `packages/reforge/src/assets.ts:12-62,102-144`:AssetBase 可无 source；精灵 number/path 双轨。
  - `packages/reforge/src/audio/bgm.ts:16-32,57-98`:数字 BGM、文件名拼接、MIDI/soundfont 裸 fetch。
  - `packages/reforge/src/main.ts:706-707,1158-1160,1370-1373,1628-1629,1700-1703,2372-2374`:场景/脚本/战斗/存档的数字音乐与 `sys:music`。
  - `packages/editor/src/main.tsx:47-51`:dev 工程音乐表绕开 FileSource。
  - `packages/editor/src/core/clone.ts:37-38`、`packages/editor/src/core/seed.ts:173-223`:按仓库提取清单复制全部资源。
  - `packages/migrate/src/pal-derived-content.ts:170-172`、`packages/migrate/src/pal-migration.ts:149`:music.json 只生成 `{id}`。
- 已知坑 / 审计文档:
  - `docs/phase2/foundation/a7-resource-closure-audit.md`:本卡的完整现状证据、终态契约、旁路清单与分期。
  - `docs/phase2/foundation/am-asset-migrate-audit.md`:既有提取/解码/资产管线审计；A7 不重写 MKF/RLE 真值。
  - 当前克隆 3,232 文件/208,744,309 字节,但运行仍可绕过工程；“复制完成”不能作为闭包证据。
  - PAL 当前 86 MIDI；1,227 个 playMusic、36 场景槽、80 战斗槽、31 单场槽、53 停曲点；正数引用零缺源 MIDI。
  - `packages/reforge/src/fsa-source.ts:50-51` object URL 每次新建且无统一 revoke。
- 不得重新引入:
  - `manifest.assets.root/music/sounds/...` 继续作为顶层或新资源族真值；未迁移族只能位于显式 `assets.legacy`,
    并由全量闭包报告持续报错。
  - 数字号补零猜文件名、可选 path fallback、应用根 `/extracted`/`/baked`/`/ui` 资源回退。
  - `sys:music` 或其他字符串魔法全局槽。
  - paletteId/多调色板概念；后续旧资源仅允许唯一 `color-table` 角色。
  - runtime 同时理解 contentVersion 2/3；v2 只允许在迁移边界读取并一次性产出 v3。A7-4 同理把 v3
    legacy 工程一次性产出无 legacy 的 v4。
- 相关测试:
  - `packages/reforge/src/fsa-source.test.ts`:现有 FileSource/FSA 基线,需补 URL 缓存与 revoke。
  - `packages/editor/src/core/project-io.test.ts:448-463`:旧 music.json round-trip,本卡应替换成 catalog round-trip/CRUD。
  - `packages/migrate/src/pal-migration-integration.test.ts`:MG2 连跑零计划与作者态保护。
  - `packages/migrate/src/migration-validate.ts:255-301`:迁移结果引用校验入口,应接 asset closure。

## 验收条件

- 功能:
  - manifest v3 的新资源只走 `assets.catalog/roles`;未迁移资源只位于 `assets.legacy`。音乐族不得在 legacy
    留任何目录、number/path 或回退；AssetId 到音乐物理路径只经一个 catalog 和 AssetResolver。
  - PAL 86 个 MIDI 与 soundfont 都登记为工程资源；BGM 运行、编辑器试听和本地 FSA 工程使用同一 resolver。
  - `SceneDef`、`startBattle`、脚本命令和存档当前曲全部使用 AssetId/null/显式 stop,行为保持“缺省延续、指定切曲、显式停曲”。
  - `content/music.json`、MusicDef 与数字 BGM API 退役；旧别名转换为 catalog label。
  - 编辑器音乐页可导入 MIDI、改名、替换、预览；被引用条目不能删除,未引用条目可删除；保存重开不丢引用或字节。
  - 作者替换 `music.pal.031` 后重迁仍指向 `assets/authored/<hash>.mid`,不被 migrated 版本覆盖。
  - 全量闭包报告继续列出尚未迁移的资源族,不得用兜底/allowlist 报绿。
- 测试:
  - 路径 guard 与 catalog/role/kind 校验表驱动全覆盖；坏路径、缺 id、kind mismatch、缺文件、size/hash 不符均 fail-loud。
  - 迁移计数精确覆盖 86 MIDI、1,227 playMusic、36 scene、80 battle、31 startBattle、53 stop；正数引用零缺失。
  - 静态扫描 `content/music.json`、`MusicDef`、音乐 `musicId/battleMusicId`、`sys:music`、`<NNN>.mid` 路径拼接和 BGM 裸 fetch 为 0。
  - 旧 v2 工程 -> v3 -> serialize/reload 无双格式；旧 music 别名与旧存档当前曲专测。
  - FSA/HTTP 相同 fixture 结果一致；切工程/dispose 后创建的 object URL 全部 revoke。
  - MG2 两次迁移后第二次 `writes/deletes/conflicts = 0`,作者音乐替换和 label 保留。
  - `pnpm check`、content/reforge/editor/migrate 相关测试与 build 全绿。
- 文档:
  - 更新 content schema、manifest/project lifecycle、asset pipeline 和音乐编辑说明；明确应用壳与工程资源边界。
  - 生成 A7 全量缺口报告和 A7-0 音乐族闭包报告；记录实际文件数、字节数和 hash 结果。
  - capability-map 只更新 W5/X2 的音乐资源生命周期事实,A7/R7 保持未完成直至 A7-4。
- 视觉 / 手工验证:
  - HTTP PAL 工程与本地 FSA 克隆工程各试听至少两首、切换同曲不重启、停曲、关闭/开启音乐后恢复。
  - 新游戏 s000 -> s001、普通战、首领战/胜利曲、读档恢复当前曲各跑一条,控制台零资源 404/HTML fallback。
  - 编辑器导入/改名/替换/删除保护/保存重开完整走一轮,并检查资源列表 id/label/path 不互相冒充。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-15）**。现状审计确认复制链、加载链和引用链未闭合；建议采用单 catalog + AssetResolver,
  以音乐/soundfont 首切片验证 contentVersion、MG2、编辑器 CRUD、运行时与本地工程全链。
- Opus: pending
- GLM: pending
- counter / 分歧处理: 待 Opus 审架构/分期与 GLM 审覆盖/迁移矩阵；任一 counter 时留在 draft。
- 缺签豁免: N/A
- build 准入结论: **blocked（三方设计签字未齐,不得修改实现文件）**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

#### A. catalog 是唯一物理真值

- `assets/index.json` 使用 `Record<AssetId, AssetRecordV1>`,记录 kind、显式工程相对 path、mediaType、bytes、sha256、
  label 与 origin。
- manifest v3 只指向 catalog 和封闭的具名运行角色；不再声明资源根/子目录。
- AssetId 是稳定不透明身份。改名、换文件、换扩展名、迁移到 authored 路径都不改变引用。
- `validateProjectRelativePath` 同时服务 FileSource、catalog、保存、克隆和 zip；绝对/越界路径在入口拒绝。

#### B. A7-0 runtime 只认识 v3,资源族不双轨

- `@type-pal/migrate` 提供一次性 v2 -> v3 变换；PAL 生成器和空白工程模板直接产 v3。尚未迁移的资源族
  被搬进 `assets.legacy`,只由隔离 LegacyAssetAdapter 读取；普通 FileSource 从本卡起拒绝绝对路径。
- editor 打开 v2 时先执行迁移并要求保存/另存,进入 EditSession 前已是 v3；reforge 正式 loader 不留 v2 回退。
- 若存档 schema 需提升版本,写显式 normalizer；旧数字 `sys:music` 转成 typed currentMusic 后删除。
- A7-4 在 legacy families 归零后生成 v4 并删除 LegacyAssetAdapter；同一资源族任何时刻只能在 catalog 或
  legacy 其中一侧,不能两边都可解析。

#### C. 音乐首切片

- 迁移 id 形态固定 `music.pal.<三位号>`；它是稳定 id,文件 path 明写在 catalog,不可反推。
- `playMusic(asset)` 与 `stopMusic` 分开；场景/战斗字段用 AssetId/null/缺席三态。
- 普通战斗、首领胜利、普通胜利和 MIDI soundfont 由 manifest 具名角色引用,删除 main.ts 数字常量。
- `WorldState.audio.currentMusic` 是持久场景 BGM 真值；战斗音乐是临时呈现态,结束恢复该字段。
- MusicTab/MusicPicker 直接看 catalog 的 music entries。导入只接 `.mid`；替换保持 AssetId；删除先问 asset reference walker。

#### D. 所有权与二进制

- `migrated/**` 由迁移器拥有；`authored/<sha256>.<ext>` 由作者拥有；`runtime/**` 有明确 license/ref。
- catalog 按 AssetId 合并；只要记录已转 authored,重迁必须保留整条作者记录。迁移器不得删除 authored blob。
- 大二进制不放 MG2 JSON baseline；catalog 和内容引用进入 baseline,二进制由 hash/所有权门禁验证。

#### E. A7-0 之后

- A7-0 仅要求音乐族全链无旧回退,公共 resolver/closure 可扩展；其他族在具名 legacy 债务区持续报红。
- 后续按 SFX -> 静态 UI/字形/图像 -> 动态资源 -> 克隆/zip 总门禁推进。
- 每接一族补 typed walker 与闭包计数并删除该族旧解析；全量报告不得因“暂未迁移”假装通过。

### 已知风险

- 风险: v3 一次改动跨 content/reforge/editor/migrate,测试面大。
- 缓解: 公共契约和音乐纵向切片同卡完成,不同时迁其他资源族；以 v2->v3、MG2、HTTP/FSA 双链为硬门禁。
- 风险: `music.pal.031` 看起来仍含数字,被误当文件名约定。
- 缓解: id 只作不透明 key；测试把同 id 的 path 改成哈希文件仍可播放,并禁止 resolver 从 id 推导 path。
- 风险: authored 替换被重迁覆盖。
- 缓解: 目录所有权 + origin + 按 key merge 三重约束,专测同 AssetId 替换后两次重迁。
- 风险: soundfont 约 6MB,重复进每个工程增加体积。
- 缓解: 自包含优先；后续可在克隆传输层去重,但工程目录和导出包仍必须物理拥有它。
- 风险: 全量哈希拖慢启动。
- 缓解: runtime 按需读；迁移/保存/导出/CI/显式检查才跑全量 hash。
- 风险: 本卡只迁音乐却被误报 A7 done。
- 缓解: 看板/能力表注明 A7-0；验收强制保留其余资源族红色缺口报告。

### 主审立场

- Reviewer: Opus
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 支持单 catalog、manifest v3、runtime 零双轨；建议音乐/soundfont 为首切片并退役 music.json。
- Opus: pending
- GLM: pending
- 用户拍板: 用户于 2026-07-15 同意按推荐顺序开始；三签齐前只允许设计审查。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（三方设计签字齐后进入 build）
- 修改文件: 尚未开始
- 实现摘要: 尚未开始
- 运行命令: 尚未开始
- 浏览器 / 手工检查: 尚未开始
- 跳过的检查及原因: N/A

## 资源生成记录(如适用)

- Generation Owner: N/A（本卡不进行 AI 生图；PAL 音频仅做确定性迁移/物化）
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: `assets/migrated/music/**`、`assets/runtime/**`（build 后记录实际）
- 尺寸 / 格式 / 透明背景 / 调色约束: MIDI/SF3,不适用图像约束
- 资源登记位置: `assets/index.json`
- 验证方式: bytes/SHA-256 + 播放/试听 + MG2

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: pending
- 截图 / 像素检查路径: N/A（本卡以音频/交互验证为主）
- 结论: pending
- 未完成项: 全部 build/review 验证

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: A7-1 SFX 资源族,再按审计分期推进。

## 交接日志

- 2026-07-15 Codex: 完成 A7/R7 现状审计、终态契约、分期和 A7-0 任务卡；Codex 设计签 agree。
  Evidence: `docs/phase2/foundation/a7-resource-closure-audit.md`；当前只改文档。
  Next: Opus 架构/实现可行性主审并签 agree/counter；不得开始实现。

## 下一位 Agent 提示词

```text
接手任务:A7-0 工程资源闭包地基与音乐注册表首切片——设计主审(Opus)
任务卡:docs/ops/tasks/A7-0-resource-closure-registry.md
当前状态:draft;Codex 已签 agree,Opus/GLM pending,build 准入 blocked
你的角色:Opus,做架构/schema/跨包/MG2/实现分期压力测试;只改任务卡和必要设计文档,不得改实现文件
先读:AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全部、docs/phase2/foundation/a7-resource-closure-audit.md、docs/phase2/editor/project-lifecycle-design.md、docs/phase2/roadmap.md §10
已完成:Codex 已审计 manifest/FileSource/AssetBase/BGM/SFX/克隆/编辑器旁路;确认当前克隆 3,232 文件但仍非闭包;提出单 assets/index.json + AssetResolver + v3 迁移债务区/v4 最终收口,并以音乐/MIDI soundfont 做首个纵向切片
请你做:
1. 审单 catalog + manifest roles 是否足以覆盖 runtime,是否存在第二真值或包边界倒置;
2. 重点审 v3 `assets.legacy` 按资源族隔离、A7-4 升 v4 删除适配器的方案:是否足够干净、是否有更低成本但不让同一资源族双轨的替代;同时审旧工程/旧存档一次性迁移;
3. 审 music.json 退役、AssetId/null/stopMusic、WorldState.audio 与战斗临时曲恢复语义;
4. 审 MG2 所有权:同 AssetId authored 替换不得被 migrated 记录/二进制覆盖,大二进制不进 baseline;
5. 审 MIDI soundfont 归工程资源、worklet 留应用壳的边界,以及 fsa object URL dispose;
6. 审 A7-0 范围/工作量是否应再切,但不能留下半条音乐旧回退;
7. 把结论、必改项和你的设计签字写回任务卡;如 counter 给出可落地替代形态。
不要做:不改 packages/**、projects/** 实现或生成产物;不把 A7/R7/capability-map 标 done;三签未齐不得进入 build
输出要求:提交仅文档改动;签 agree 或 counter+理由;更新交接日志和“下一位 Agent 提示词”给 GLM 做覆盖/迁移/测试矩阵复核。
```
