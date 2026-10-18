# GLM foundation阶段交付与Codex接收入口

Owner: GLM（持续执行）；Codex（阶段据证验收/集成）
Status: build；以下只记有限模块结果，不声明全专项完成

- [持续任务准入](../glm-pre94-foundation-goal.md)：pre94全部剩余复审/获准整改，随后94–102既有返工；内部小片、阶段交付。
- [阶段1终验记录](codex-stage1.json)：MKF/RNG/YJ2六笔候选已集成；正文保持、定向原生34/34、34/34、41/41已据证核对，52个独立身份，未重跑这些测试。
- 作者原件：[MKF](mkf/README.md)、[RNG](rng/README.md)、[YJ2](yj2/README.md)。作者审查与Codex实际核过的差异/证明/原件分开记，不把摘要当日志。
- 模块2作者原件：[shared纯类型/合同六文件](shared-types/README.md)（基点53db76bbb，review待验收）。修FRAME_MS_FADE已废弃设计注释、loadScene过时stub注释、tables重复LevelUpMagicEntry声明（tsc declaration emit 前后diff=仅删逐字节相同重复块）、cells措辞；shared 16文件128/128、typecheck 0错、scoped biome 0/0/0。登记5个0消费公共出口（SpriteSet/PixelPos/FRAME_MS_FADE/BattleEffectIndex/LevelUpMagicTable）待Codex裁定，未删。
- 模块3批1作者原件：[extract events核心四文件](extract-events-core/README.md)（基点53db76bbb线，review待验收）。修 0x0059 过时stub注释（与shared/events.ts同源）与 disasm 模块头具名产出范围；真盘 roundtrip 77/77 内含 SSS.MKF 全量字节恒等；登记 recompile 未知label静默0候选与 FieldKind/OpcodeDef 导出收窄候选。
- 模块3批2作者原件：[extract io/word+utils/gbk](extract-io-word-gbk/README.md)（同线，review待验收）。修 word.ts 头部重复括注；14/14、body-invariance 齐；登记 readBlock 短输入静默空串与 Words.scenes 字段名误导两候选。
- 模块3批3作者原件：[extract font/bdf+scene+map](extract-font-scene-map/README.md)（同线，review待验收）。bdf 容错合同注释1处；23/23含真盘MAP/GOP；三登记（bdf输入域/scene区间非单调/substr nit）。extract模块批1-3共13文件已冻结，余parsers家族+cli.ts(输出策略冻结段只读)+output-boundary.ts留模块3续批。
- 模块3批4作者原件：[extract parsers小件×4](extract-parsers-small/README.md)（同线，review待验收）。修 rix "script"笔误与 sounds 过时M6注释；真盘34/34含SDLPal RGBA对拍；登记截断容忍族/LevelUpMagicEntry双类型/decodeRngAnim仅测试消费。
- 模块3批5作者原件：[extract enemies+player-roles](extract-enemies-playerroles/README.md)（同线，review待验收）。修 EnemyTeam.slots 两处不存在字段引用（C2 counter 闭口）、M3→M4 dump范围双处过时；14/14真盘；登记 build*Map 静默空与 EnemyObject 双类型。
- 模块3批6作者原件：[extract spells+enemy-teams+items](extract-spells-teams-items/README.md)（同线，review待验收）。零整改复审;tables.test 全量89/89(补链WORD.DAT后);勘误批4/5未披露的tables套件加载失败;登记spells.ts同族截断策略不一致。
- 模块3尾批作者原件：[extract cli+battle-sprite+output-boundary](extract-cli-tail/README.md)（同线，review待验收）。cli.ts 919行深读,修4处过时注释(产出目录清单/rng manifest/M6/小写mus.mkf);清理策略段冻结只读;24/24+0失败套件。extract 模块7批25文件全部冻结,余Codex已切片文件的B-G补维后续轮。
- 模块4批1作者原件：[game assets三文件](game-assets-batch1/README.md)（同线，review待验收）。修 loader 战斗资源注释与 .rle 管线自相矛盾+T28 远古措辞;19套件38/38含真blob快照;登记 DialogSprite 同构候选。game 模块开工,后续 core/present/shell 分批。
- 模块4批2作者原件：[game assets png+rle-decode](game-assets-batch2/README.md)（同线，review待验收）。零整改复审,png.ts 资源清理/cause 包装/M3.5双通道合同核验成立;10套件12/12。assets 家族5/5生产文件收口,下一批 core。
- 模块5批3作者原件：[game core小文件×4](game-core-batch3/README.md)（同线，review待验收）。B-G补维零整改;mode autoScript门/宝物屋tp补丁/老档归一化核验成立;7套件20/20。core续批:poison/search/identity等→大文件补维轮。

集成修正：MKF仅首offset/表长4对齐、并非所有chunk偏移；SDL坏档结果/全原盘保证不能泛化；readChunk生产注释保留借用合同、去掉测试治理措辞。RNG跳帧保留基面继续解码，不保证缺帧后的画面等价。正常资产对拍不代替坏帧策略证明。

旧撤回恢复：mkf.boundaries.test.ts、rng.test.ts、yj2.boundaries.test.ts、rle.glm-o.test.ts四行恢复review，不是本批重新发现代码失败。中央ledger3319/245closed/109review/2965pending，0新关闭；CODE2/2b仍partial。

O-5为YJ2输出长度分配/输入域候选，归父卡；不得实际尝试巨量分配、不得擅加codec上限或改错误/公共合同。RLE格式真值、G-1/O-1/O-2/O-4及树归约向量原状态保留。

继续既有大goal，无需再等逐片准入：下一模块shared纯类型/合同文件，自查活跃Owner后推进。保持当前foundation worktree；先fetch核上游并保存自己的改动，按最新3y接续已集成提交。正式跨包/typecheck验证前完成自有依赖图，不再把指回主树的包级链接结果记作候选验证。普通类型注释/测试精度范围不自动授权schema/公共接口变更。现有可靠结果复用，纯注释不反复跑相同34用例或全仓门。
