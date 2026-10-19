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
- 模块5批4作者原件：[game core 3o/3n余量×4](game-core-batch4/README.md)（同线，review待验收）。B-G补维零整改;poison差异挂draft卡/搜索注释已修/量化边界吻合;27套件90/90。core小文件全收口,下一批大文件补维轮(event-system/battle-system/scene-system/game-state)。
- 模块5批5作者原件：[game-state.ts大文件补维](game-core-gamestate/README.md)（同线，review待验收）。修 InventoryEntry 错挂注/dialogHistory 不入存档反事实(核bootstrap 定谳)/postBattleResume 孤儿docblock归位;71/71+game typecheck 0;大文件补维轮续 scene-system→event-system→battle-system。
- 模块5批6作者原件：[scene-system.ts大文件补维](game-core-scenesystem/README.md)（同线，review待验收）。删两零调用死函数(_npcAt/_findTriggerZoneNpc,全仓grep零引)+真值注合并;基线110/110→后132/132、typecheck 0。大文件轮续 event-system→battle-system。
- 模块5批7作者原件：[event-system.ts大文件补维](game-eventsystem/README.md)（同线，review待验收）。5117行全文读毕,修6处常量级过时实现描述(cash跳转/removeItem装备消耗/商店stub/0x05双职责/毒level清/0x2D状态表,均核handler现状定谳);67套件326/326+typecheck 0。大文件轮终章 battle-system。
- 模块5批8作者原件：[battle-system.ts大文件终章](game-battlesystem/README.md)（同线，review待验收）。3131行全文读毕,修 tickPreBattle"M3跳过scriptOnReady"过时注;30套件68/68+typecheck 0。大文件轮收官,battle家族余量(actions/opcodes等深切片文件B-G补维)为下一批。
- 模块6批9作者原件：[battle actions家族×4](game-actions-batch1/README.md)（同线，review待验收）。attack.ts删死局部casterLevel(基线8/8→超集32/32);attack-mate/defend/flee零缺陷;登记私有helper合并候选+magic.ts L122待下批。actions续批 item/magic/throw-item/coop-magic。
- 模块6批10作者原件：[actions续批×4](game-actions-batch2/README.md)（同线，review待验收）。magic L122 定谳修正(playMagicAnim通知性op无渲染消费方,动画经时间线全实现);item/throw/coop零缺陷;登记 playMagicAnim emit 清理候选+present-battle L198 并列误导。actions 家族 8/8 全收口,下一批 battle 余量(opcodes/state/runtime-context/anim-driver/turn-queue/formulas)。
- 模块7批11作者原件：[battle-opcodes.ts](game-battleopcodes/README.md)（同线，review待验收）。修头计数(5-7→40+实际44常量)/revive docblock与M11实现矛盾/删void beforeHealth死语句(变量仍用于maxHealth fallback);61/61+typecheck 0;混合批以定向超集+diff逐行核对证行为保持。battle余量续:state/runtime-context/anim-driver/turn-queue/formulas/magic-damage/enemy-ai/status。
- 模块7批12作者原件：[battle-state+runtime-context](game-battlestate-ctx/README.md)（同线，review待验收）。零整改批(过时模式扫描零命中,3u 返工后高地);13套件25/25+typecheck 0。battle余量续:anim-driver/turn-queue/formulas/magic-damage/enemy-ai/status/magic-object/simulated-magic-target。
- 模块7批13作者原件：[anim-timeline+driver+turn-queue](game-animtimeline/README.md)（同线，review待验收）。零整改批(24导出census全有消费者,queue头经队列批准修复后高地);19套件44/44+typecheck 0。battle余量续:formulas/magic-damage/enemy-ai/status/magic-object/simulated-magic-target/battle-positions/settlement/finalization。
- 模块7批14作者原件：[battle七小文件收口](game-battlecore-misc/README.md)（同线，review待验收）。零整改批(battle家族三连零整改=3m+数值审计后高地,160/161数值裁决维持pending);23套件90/90+typecheck 0。**battle 家族全部收口**(actions 8/8+opcodes+state/ctx+anim三件+七小件),下一模块 present(L198 修正起)→shell→menu。
- 模块8批15作者原件：[present.ts+present-battle.ts](game-present-core/README.md)（同线，review待验收）。纯注释5处:L198 op去向定谳(三op声音由shell消费/playMagicAnim无消费方/四op无emit方/对话框不经bus)+头部"M3简版/留M5"过时清单删除+L104跨帧状态+present.ts脆行号;body-invariance恒真,9文件112/112+typecheck 0。新增登记:flashEnemy/flashPlayer/showBattleUI/clearDialogBox四死union成员、showDialogBox与gs.dialogBox双通道归约。present余量续:dialog-box/font/draw-*/follower/screen-*/framebuffer家族。
- 模块8批16作者原件：[draw-battle-*六文件](game-present-battledraw/README.md)（同线，review待验收）。纯注释7处:sprites头部"M3硬编码/索引0透明"双不实+SpriteAsset过时帧注,ui双"sprite化非本任务范围"过时+孤儿docblock归位(drawPlayerInfoBoxes)+enemyPos箭头误导参数注;bg/effect/num/settlement四件零缺陷;body-invariance恒真,8文件79/79+typecheck 0。新增登记:drawBattleUI残留_enemyPos参数清理候选。present余量续:present根目录小件家族。
- 模块8批17作者原件：[present根目录11文件](game-present-root/README.md)（同线，review待验收）。纯注释3处:draw-tilemap两处日语注释译中+sortedDraw引用不实、dialog-box drawDialogBox docblock与shouldShowKeyIcon自相矛盾(line-done不显icon/palette轮转);其余9文件零缺陷(font近似边界/follower-pos冻结语义等真值锚完整);body-invariance恒真,27文件319/319+typecheck 0。**present 模块全部收口**(core+battledraw+root),下一模块 present/menu → shell。
- 模块8批18作者原件：[present/menu九文件](game-present-menu/README.md)（同线，review待验收）。纯注释2处:equip头"留follow-up"过时(已复用完整grid)、player-status头"毒row首版skip"过时(C6已实现);其余7文件零缺陷(shadow真值修正史/WIN95-ASCII双布局互斥等);body-invariance恒真,21文件47套件154/154+typecheck 0。**present 目录全部收口**(root+battle+menu=29文件),下一模块 shell → menu(core)→ content/migrate/reforge/editor。
- 模块9批19作者原件：[shell音频/io八小件](game-shell-audio/README.md)（同线，review待验收）。零整改批(fetch-retry GOAWAY根因考证/audio-midi RIFF守卫/precache补发机制等真值锚全对);13文件26套件72/72+typecheck 0。shell余量续:播放器批(avi/fbp/rng/ending/splash/trademark)→交互循环批→bootstrap.ts大文件。
- 模块9批20作者原件：[shell播放器六文件](game-shell-players/README.md)（同线，review待验收）。纯注释2处:trademark-fallback双"1秒淡出"过时注同步L43定谳(PAL_FadeOut(1)=600ms);其余5件零缺陷(avi键泄漏分析/rng in-flight去重/splash L42正解);body-invariance恒真,14文件36套件73/73+typecheck 0。shell余量续:交互循环批(input/main-loop/boot-loading/precache-ui)→bootstrap.ts+audio.ts大文件批。
- 模块9批21作者原件：[shell交互/循环四文件](game-shell-loop/README.md)（同线，review待验收）。零整改批(input WASD还原/DM30抑制集/main-loop DM31不补帧考证/boot-loading 810预估校准史/precache-ui四相状态机);10文件28套件112/112+typecheck 0。shell余量终批:bootstrap.ts 1934行+audio.ts大文件。
- 模块9批22作者原件：[bootstrap.ts+audio.ts](game-shell-bootstrap/README.md)（同线，review待验收）。纯注释3处:双"M5真做时"未来注定谳(walkFrames链在present/npcSprites closure为定案)+~3200请求数过时(实810);audio.ts零缺陷(L46去重/L47loop/DM29);body-invariance恒真,8文件23套件41/41+typecheck 0。**shell 模块全部收口**(audio/io+players+loop+bootstrap=22文件,三零整改批)。下一模块 menu(core)→content/migrate/reforge/editor。
- 模块10批23作者原件：[menu小中件15文件](game-menu-small/README.md)（同线，review待验收）。纯注释2处:item-select"follow-up精细"过时注定谳(卖路径灰显已在sell-menu实现,工厂零生产caller)+battle-state:514错指builder(buildBattleMagicSelect,批12漏网);其余13文件零缺陷;body-invariance恒真,28文件105套件340/340+typecheck 0。新增登记:createItemSelectMenu死导出。menu余量:magic-script/inventory-menu/in-game-magic-menu三件→menu-driver 1054行大文件。
- 模块10批24作者原件：[menu大件三文件](game-menu-large/README.md)（同线，review待验收）。死代码删除1项:magic-script MAX_PLAYER_ROLES+void消lint(批11判例);inventory-menu/in-game-magic-menu零缺陷(L39圣灵珠/L40static记忆/DL22/L35/L37/L41锚全对);混合批协议:定向8文件110/110+typecheck 0+diff恰两块删除。menu终章:menu-driver.ts 1054行。
- 模块10批25作者原件：[menu-driver.ts](game-menu-driver/README.md)（同线，review待验收）。纯注释1处:"M6真做load现stub console.debug"过时注(handler注入已真做);1054行全锚(DL20/21/DM23/24/DH9族谱)零缺陷;body-invariance恒真,5文件31套件83/83+typecheck 0。新增登记:makeEquipMenuEntry死导出。**menu(core) 18文件全部收口**(b23-25三批)。下一模块:game余量目录(inspect/save/tools/dev)→content/migrate/reforge/editor→94-102。
- 模块11批26作者原件：[core残余六件](game-core-residual/README.md)（同线，review待验收）。纯注释5处:command-bus"M3激活"死接口定谳(suspendRaf取代,零消费方)、equip-effect双过时注(0x2D/0x29已实现/0x18已真做swap非noop)、equipment-state"简版留follow-up"与实现矛盾;rng/inventory-state/event-opcode-player零缺陷;body-invariance恒真,10文件51套件127/127+typecheck 0。新增登记:CommandBus.complete死接口。**core/全目录收口**(46文件)。game余量:inspect/save→analytics→tools→dev。
- 模块11批27作者原件：[inspect+save+analytics七文件](game-inspect-save-analytics/README.md)（同线，review待验收）。零整改批(battle-inspect双消费方/E04池/IDB commitWrite语义/analytics consent三态);9文件20套件50/50+typecheck 0。game余量:tools八件→dev两件。
- 模块11批28作者原件：[tools+speedrun十七文件](game-tools/README.md)（同线，review待验收）。零整改批(checkpoints PARTYOFFSET考证/timer暂停双轨/minimap引用判失效/tools-panel battleSig范围声明);21文件52套件106/106+typecheck 0。game余量终批:dev两件(state-dump 117/dev-panel 2342)。
- 模块11批29作者原件：[dev两文件](game-dev/README.md)（同线，review待验收）。纯注释1处:applySceneJump"tile/palette留首屏M5升"半过时注(tile已T17路由,palette仍真);BOSS_ROSTER三方考证/t37复刻/彩依pan锚等2338行零缺陷;body-invariance恒真+typecheck 0。**game 包生产源码全部收口**(125文件,b1-b29)。下一站:content→migrate→reforge→editor→94-102返工。

集成修正：MKF仅首offset/表长4对齐、并非所有chunk偏移；SDL坏档结果/全原盘保证不能泛化；readChunk生产注释保留借用合同、去掉测试治理措辞。RNG跳帧保留基面继续解码，不保证缺帧后的画面等价。正常资产对拍不代替坏帧策略证明。

旧撤回恢复：mkf.boundaries.test.ts、rng.test.ts、yj2.boundaries.test.ts、rle.glm-o.test.ts四行恢复review，不是本批重新发现代码失败。中央ledger3319/245closed/109review/2965pending，0新关闭；CODE2/2b仍partial。

O-5为YJ2输出长度分配/输入域候选，归父卡；不得实际尝试巨量分配、不得擅加codec上限或改错误/公共合同。RLE格式真值、G-1/O-1/O-2/O-4及树归约向量原状态保留。

继续既有大goal，无需再等逐片准入：下一模块shared纯类型/合同文件，自查活跃Owner后推进。保持当前foundation worktree；先fetch核上游并保存自己的改动，按最新3y接续已集成提交。正式跨包/typecheck验证前完成自有依赖图，不再把指回主树的包级链接结果记作候选验证。普通类型注释/测试精度范围不自动授权schema/公共接口变更。现有可靠结果复用，纯注释不反复跑相同34用例或全仓门。
