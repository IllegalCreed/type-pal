# migrate-all(migrate 全包 34 生产文件)八维复审批 —— migrate 包收口批

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
