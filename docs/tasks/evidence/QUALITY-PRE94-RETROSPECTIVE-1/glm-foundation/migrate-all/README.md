# migrate-all(migrate 全包 34 生产文件)八维复审批 —— migrate 包收口批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 13 批 39(migrate 包唯一批,全文读毕后整包定谳)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 74+ 提交)。34 生产文件全文读毕共 6032 行,覆盖 io/供应/地图转换/事务/合并/发布/资产全链。零整改批(B–H 全维通过;零代码/注释改动,工作树零 diff)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

零整改依据按子域:供应边界族(pal-content-supply-io/supply/pal-source-io/pal-derived-content/sound/pal-sound-assets/pal-manifest/battle-sprites)——"只读 PAL 供应入口,不加载场景事件/技能表/AI 转换源"窄供应纪律一致;s294 空 stub 精确校验"停止迁移并重新审计"哨兵;295 场景/223 地图数卫。source-facts——LPCSPRITE 字节指针解码考证(palcommon.c:848-851 iFrameNum<<=1 逐字论证);roleId 3/4 名字指针对调 ⚠;48..52 真实头像帧 53 全透明不入表。pal-role-mapping——EQUIP_INDEX_TO_SLOT 对 pal-extract 旧注释逐位实证纠错(196 头巾/225 披风…)+golden 测锚;mapRoleSpritesByNumber 旧编号解析一次、多语义 fail-loud。地图转换(project-map-converter/audit)——SOURCE_MAP word 位域解码/回编码唯一边界;残余位 0xe000c000 只报告不进 schema;semantic round-trip 非零即停线。事务族(migration-path/baseline/project-io/transaction/write-plan)——journal v2 恢复"不信任磁盘 journal,全量验证完才允许写入";manifest 必须事务最后一项+资源闭包前置;原子地图 hash-only baseline 合并"hash 相同 ⟹ 字节相同";staged wx 排他+owned dev/ino 清理。merge——数组身份模式表(id/pages/stages/scene-index)、poses 动作原子三方合并禁杂交、authored 接管整条归作者、whole-subtree fast path 白名单排除。发布门(pal-current-publication)——current baseline 三方 base+六原始角色/地图/瓦片集窄核直取;FORBIDDEN_CURRENT_PATH 历史路径拒收;scheme 49/roots 11 锚。资产全链(pal-assets 1318 行)——大世界精灵 636/1332725B/4133 帧/30 坏尾+战斗精灵 player19+enemy153/900973B/775 帧/6 坏尾 tuple digest 冻结;三向闭包音效 505 段;TPFS 确定性生成(level 9 deflate);物化"全量预检先于第一个写入";退役只从 catalog 所有权推导。布局 overlay 族(pal-world-sprite-layouts/registry/semantic-alias)——逐项 events/all.json L_ 锚点(禁止按编号/标签/帧数推广);语义别名闭包四态+清单外引用 fail-loud。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

migrate 全包定向回归 [directed.json](directed.json):96 个测试文件 245 套件 739/739 全 passed、0 failed suites、snapshot 全零、success=true(startTime 2026-10-19T02:17:14.836Z);构成五层——主测/其它 62 文件 407 例、glm-o 10 文件 215 例(pal-assets/pal-current-publication/migration-transaction/migration-merge/pal-supply-guards 各 27-37 例)、kimi-r1 7 文件 53 例、.pal.test.ts 真盘后缀 11 文件 40 例、glm-next-wave 6 文件 24 例。口径事实:初跑 27 失败=worktree 缺 data/extracted 软链的环境缺口,补链后全绿、零代码改动——本回执只含补链后绿跑,初红不在件内;回执 *.pal.test.ts 文件为 11 个,与本页"8 个真盘 pal.test 族"表述存在计数出入(原因未核)。断言实样如『绝对路径目标被 safeRel 拒绝』『mapActor(role0) 与 demo 手作 li-xiaoyao 深等』。补充门:tsc --noEmit -p packages/migrate exit 0;工作树零 diff。

## 结果

批内结论:34 文件零缺陷,零整改;migrate 包全部收口(唯一批)。登记项无新增。历史时点回执保持原状,本页治理不产生新执行结果。

## 限制与复核

未重跑任何测试/typecheck;绿不抹初红(27 失败的环境缺口根因与补链操作未独立复核,按本页自述转述);245 套件为 vitest 套件字段,与 (文件,根 describe) 对 155、文件数 96 三口径分轴;8-vs-11 真盘族口径差待 Owner 裁定。候选待 Owner 非作者接收;失效条件:34 生产文件或 96 测试文件身份变化时降级为历史记录。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3242B / SHA-256 e67c750b8c58c2cbdf8c049266169dac46ce4eaa969708b265af2207291eb571；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# migrate-all(migrate 全包 34 生产文件)八维复审批 —— migrate 包收口批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 13 批 39(migrate 包唯一批,全文读毕后整包定谳)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 74+ 提交)
- Coding Owner:GLM;34 生产文件全文读毕(6032 行:io/供应/地图转换/事务/合并/发布/资产全链)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(按子域)

- **供应边界族**(pal-content-supply-io/supply/pal-source-io/pal-derived-content/sound/pal-sound-assets/pal-manifest/battle-sprites):"只读 PAL 供应入口,不加载场景事件/技能表/AI 转换源"的窄供应纪律贯彻一致;s294 空 stub 精确校验"停止迁移并重新审计"哨兵;295 场景/223 地图数卫。
- **source-facts**:LPCSPRITE 字节指针解码考证(palcommon.c:848-851 `iFrameNum<<=1` 逐字论证);roleId 3/4 名字指针对调 ⚠;48..52 真实头像帧 53 全透明不入表。
- **pal-role-mapping**:EQUIP_INDEX_TO_SLOT 对 pal-extract 旧注释的逐位实证纠错(196头巾/225披风…)+ golden 测锚;mapRoleSpritesByNumber"旧编号解析一次,多语义 fail-loud"。
- **地图转换**(project-map-converter/audit):SOURCE_MAP word 位域解码/回编码唯一边界;残余位 0xe000c000 只报告不进 schema;semantic round-trip 非零即停线。
- **事务族**(migration-path/baseline/project-io/transaction/write-plan):journal v2 恢复路径"不信任磁盘 journal,全量验证完才允许写入";manifest 必须事务最后一项+资源闭包前置条件;原子地图 hash-only baseline 合并"hash 相同 ⟹ 字节相同"论证;staged `wx` 排他+owned dev/ino 清理。
- **merge**:数组身份模式表(id/pages/stages/scene-index)、poses 动作原子三方合并禁杂交、authored 接管整条归作者、whole-subtree fast path 的白名单排除论证。
- **发布门**(pal-current-publication):current baseline 三方 base + 六原始角色/地图/瓦片集窄核直取;FORBIDDEN_CURRENT_PATH 历史路径拒收;scheme 49/roots 11 锚。
- **资产全链**(pal-assets 1318 行):大世界精灵 636/1332725B/4133帧/30坏尾 + 战斗精灵 player19+enemy153/900973B/775帧/6坏尾 tuple digest 冻结;三向闭包(metadata/asset-manifest/目录)音效 505 段;TPFS 确定性生成(level 9 deflate);物化"全量预检先于第一个写入"+ authored 接管只验不复制;退役只从 catalog 所有权推导不扫目录。
- **布局 overlay 族**(pal-world-sprite-layouts/registry/semantic-alias):逐项 events/all.json L_ 锚点(禁止按编号/标签/帧数推广);语义别名闭包报告(currentLegacy/generatedLegacy 四态)+ 清单外引用 fail-loud。

## 验证

- migrate 全包(含 8 个真盘 pal.test 族):**245 套件 739/739,0 failed suites**(初跑 27 失败=worktree 缺 data/extracted 软链的环境缺口,补链后全绿,零代码改动) → [directed.json](directed.json)
- `tsc --noEmit -p packages/migrate`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
