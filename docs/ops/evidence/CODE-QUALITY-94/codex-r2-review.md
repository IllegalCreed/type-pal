# CODE94/95 与 CODE97–102 — Codex 再验收（R2，2026-10-15）

候选 `1f8bcd468`；主线 `cddf65557e60619e40e38168b276cf01981a106a`。独立工作树 `quality-menu-accept-94-95/type-pal`，分支 `codex/quality-menu-accept-94-95`；开始时工作树干净，FF 到贡献者最新提交，0 behind / 12 ahead。未写主工作树、未改 packages/依赖/规则/coverage baseline、未合 main。单 Agent 独立复核，旧签字与原始回执保留。

## 分批裁定

| 批 | 独立裁定 | 当前状态与剩余条件 |
|---|---|---|
| 94 | counter | rework。R2 旧 id0/stub 注释、R3 flags 入参强转已纠正；新增原版对照反证与测试质量问题，R1 非零运行诊断仍在。30 条不闭合。 |
| 95 | accept（仅三份 fixture 修正） | review。R4 已用合法单体物品替换，原 oracle 保留；完整统一门仍依赖94，不标 done/已验证。 |
| 97 | counter | rework。装备位注释错误、测试判别力与 test-only 页码/分类边界未清。 |
| 98 | counter | rework。基础状态机可读，但去重结论有直接反例，真实标题取消链遗漏；player-status 局部合同不升级为整卡关闭。 |
| 99 | counter | rework。已知非法 fixture 未修，cov85 另有重复 itemId 非生产库存；标题取消真值与异步保存 ownership 未充分核验。 |
| 100 | counter | rework。内存测试误称 IndexedDB，测试自写 counter 不能证明生产聚合；过时注释与去重待修。 |
| 101 | counter（P1） | rework / 存档停线。主路径事务失败被报告成功已反控复现；独立高风险卡先核前提，不按“薄包装”放行。 |
| 102 | counter | rework。残缺 GameState as never、DOM/计时器隔离与异步错误/解绑 oracle 未完成；toast 语义不是仅凭“视觉延后”即可免测。 |

本轮新增关闭 **0 文件**。账本应保持 3267 inventory / 229 closed / 44 review / 2994 pending；没有把本轮读过但未闭合的测试批量改为已验证。

## 直接反证与返工要求

### C1：统一门仍非干净通过（P1，94及整个集成窗口）

独立解析未经裁剪原件，SHA/字节数/终态见 `codex-r2-mechanical-proof.json`：旧全仓check 3489条act+2导航诊断；新 R2 ratchet **3490条act+2导航**；新 R2 protected **3646条act+2导航**，各退出0。GLM已更正部分文字，归属editor不使诊断消失。当前ledger的“GLM独立全门完成”不能继续作为通过依据。不得静音、exclude、弱化规则。集中诊断另核Owner/白名单；不授权GLM越界改editor。

本轮因已存在可复现语义counter，未重复运行全仓check/ratchet/protected三个长门，不把GLM旧回执说成本轮Codex执行或1f候选全门通过。语义返工完成后按模块窗口统一跑全门，不为每条文档更新重跑整仓。

### C2：大世界法术“隐藏”固化了与SDLPal相反的oracle（P1，94）

完整读取 `in-game-magic-menu.ts` 与三份专属测试、`magic-select.ts`及其测试，再读 SDLPal `magicmenu.c:338-372`：C把所有已学非零法术入表，非大世界可用仅设 `fEnabled=FALSE`，并不删除。当前 `buildSpellMenu:135-139`先filter删除，主测试:486-498又要求305不出现；同文件225/262/487用JSON.parse产生any对象后当typed roles，GLM“typed零强转”表不能证明其合法性。

`codex-r2-menu-counter.mts/.txt` 调真实工厂，以完整typed角色/法术/数值构造已学[300,305]，实际只有[300]，而SDLPal应保留305并禁用。**仅称SDLPal验证，未冒称pal.exe实机确认**。另卡 [GAME-OUTSIDE-MAGIC-DISABLED-1](../../tasks/GAME-OUTSIDE-MAGIC-DISABLED-1.md)，本轮停在证据，不修改机制、公共接口或UI。

### C3：标题读档取消未复位光标（P2，98/99）

SDLPal `uigame.c:143-150`，取消槽位后 `wDefaultItem=0`；当前driver:984-990仅pop原opening对象。真实public dispatch顺序 Down→Confirm→Menu 的独立探针留下 cursor=1；现有cov85:819-832仅断言栈和kind，不检查默认光标。`opening-menu.ts`注释声称复位，factory自身不能保证caller复位。另卡 [GAME-OPENING-CANCEL-CURSOR-1](../../tasks/GAME-OPENING-CANCEL-CURSOR-1.md)，不在审核卡偷改行为。

### C4：IDB请求成功不等于保存事务成功（P1，101）

`indexed-db.ts:49-60,63-66,84-86`丢掉transaction引用，只等request.onsuccess；没有等待oncomplete或捕获commit/abort失败。真实Save caller是bootstrap:1108-1118快存与driver:1007-1017系统保存，前者await后显示成功toast。W3C [transaction lifecycle](https://w3c.github.io/IndexedDB/#transaction-lifecycle) 明确请求成功后事务仍可能中止；成功提交才发complete。

`codex-r2-idb-counter.mts/.txt` 复用已经安装的fake-indexeddb 6.2.5，不改依赖；真实createInitialGameState→Save→IndexedDbSave，先正控槽1保存读回321，再在槽2 put.success中合法调用transaction.abort：已观测abort、槽2为空，但saveSlot Promise已resolve。退出0表示反证成立，**不是产品测试通过**；这是符合规范的故障注入，不宣称复现浏览器自然磁盘满。另卡 [GAME-SAVE-IDB-COMMIT-1](../../tasks/GAME-SAVE-IDB-COMMIT-1.md)。未改DB版本/清档/schema/兼容代码。

### C5：注释、合法输入、排重和判别力（P2）

- 94 `menu-mode.test.ts:65/75`仍把 `{phase:'list'}`/`{}`当inventory state；ActiveMenuEntry.state是unknown不等于生产InventoryMenu合同合法。R3去掉roles强转成立，但未清这些缺字段输入。`equip-menu.glm-phase1-leaves:45-50`与主测试“.list是InventoryMenuState”/“初始phase”重复filter/phase/cursor断言，须按合同排重，不能以manifest旧字节保留。原30条分别见下表。
- 97 `item-select.ts:17`称0x01装备，SDLPal `global.h:135-136`实际0x01可用、0x02装备；:48虚构`kItemFlagImportant`（枚举无此项），不能把工程近似分类写成原版标志。`primitives.ts:107-126`引用ui.c:540的PgUp真值，实为Up/Left分支；页码导出无生产caller，须说明test-only的保留依据/删除方案，不能只因覆盖率留存。
- 97 `primitives.glm-phase1-leaves:25-36`标题目标disabled，实际target=2是enabled，删除跳禁用逻辑仍可通过；`item-select.glm-phase1-leaves`的potion投掷否决使用usable=false，使否决位被另一条件遮蔽；important否决用sellable+equipable同时true，不能独立区分两个守卫。修输入与反控，不能仅降标题。
- 98 `opening-menu.glm-phase1-leaves:21-29`与主测试:12-25/41-50同样new→load→new，没有新合同，头注释“新差异choice映射”不实。保留词表注入与空表防御轴，删除已证重复后官方重测，不堆替代弱用例。player-status测试角色10/20/30只证明索引通用防御，不当生产role域真值。
- 99 `menu-driver.test.ts`仍有残缺Item/Role双强转与any（作者E7已知，不因digest保护推迟修正）。`cov85.test.ts:359/555`反复push相同itemId以凑11条库存；真实addItemToInventory按id合并，不会这样生成。应以11个不同合法条目保持精确导航oracle。slot load异步测试只证成功结束，不证错误/取消/并发ownership；Promise.resolve(handler(slot))也不捕获同步throw，需分清实际async bootstrap域与公开sync handler域，不擅改接口。
- 100 `save-slot-menu.test:146-159`自写simulateSave聚合再断言1/2/3/4，不执行driver聚合；相邻menu-save-chain已真正触发driver并断言他槽7→新槽8及原槽不变，精简重复模型。原卡“IndexedDB before/afterEach隔离”与101自己确认的无IDB环境矛盾；_clearAllForTest仅清内存。leaves头注释也误称旧测试fetch×IndexedDB。产品头部仍引用不存在createSaveSlotMenuAsync，不接受“注释高质量”。非顺序自定义slot10/20是公开工厂防御，不代表可传到Save生产域。
- 101 api头部in-memory stub错误当前R2仍未修。api.save只比较上下界，不拒绝NaN/小数；生产caller当前整数1..5，公开输入合同是否收紧列review，不据此直接改save接口。openDb失败Promise缓存、重置未close连接也未被主路径测试证实；不能写“hot-reload已处理重开”。8条内存API测试有效但不证明IDB。
- 102 `quick-save.test:5-6`as never残缺GameState与{} dialog/menu不合法；有createInitialGameState可用。afterEach只移除listener，真实toast仍留下DOM和2s/220ms计时器；未断言解绑后键无效、preventDefault、save reject/load false/load reject的反馈。相邻toast单测证明展示原语，不证明quick-save选择正确反馈；这些是可单测功能，不用为其启动剧情E2E。

## 实际全文读取：CODE94 manifest逐文件记录

以下是**本轮实际读取**与局部观察，不是30条accept。生产caller为menu-mode/driver/scene-system/battle-system/bootstrap及present/menu消费域；具体调用范围与primary见C2–C5和后表。主测试、boundary、leaf三层必须分别给证，不用表短代替源码读取。

| core/menu下文件 | caller / oracle与局部观察 | 本轮判定 |
|---|---|---|
| menu-mode.ts | 真dispatch后空栈resume；battle/shop/explore的ownership在stack | 局部合同成立，窗口review |
| menu-stack.ts | scene/battle/driver公用；不引脚本执行器，shop waiting清理 | 局部合同成立，窗口review |
| menu-mode.test.ts | 真tick/open/close；C5两处假inventory state | rework |
| inventory-menu.ts | driver/equip/sell/draw库存快照/确认门；0哨兵注释已纠正 | R2修正接受，未升级closed |
| inventory-menu.test.ts | 单体死人目标、真实pickItemRowColor六分支；full Item/Role | CODE95局部accept |
| inventory-menu.boundaries.test.ts | [2,0]返回role0、inUse等值/装备0,-1、快照不别名 | CODE95局部accept |
| inventory-menu.glm-phase1-leaves.test.ts | cancel写static记忆、错相/空ID防御；静态记忆需清理 | review，非产品完整caller证明 |
| shop-menu.ts | driver买意图与cash门，交易仍归driver；保留旧sell模式API另核 | 局部合同成立，窗口review |
| shop-menu.test.ts | 真opcode26→dispatch购买→resume；R3多余cast已清 | 局部修正接受；handler cleanup待核 |
| shop-menu.boundaries.test.ts | price等值与差1、No意图/catalog-before | CODE95局部accept |
| shop-menu.glm-phase1-leaves.test.ts | 目录缺失/错相返回防御，非真实商品属性 | review |
| equip-menu.ts | driver脚本swap与请求分层；两死参数不借本批改API | review，E1保持 |
| equip-menu.test.ts | grid类型、目标请求/取消/环绕；不冒称脚本效果 | 局部合同；与leaves排重 |
| equip-menu.boundaries.test.ts | 占用门/[2,0]/真实装备库存快照 | 局部合同，窗口review |
| equip-menu.glm-phase1-leaves.test.ts | 缺目录/错相/单人边界；filter/phase重复 | C5 rework |
| in-game-menu.ts | driver读取WORD id→choice，confirm/switch只持state | 局部合同，窗口review |
| in-game-menu.test.ts | 真WORD/词表/reset/反排id与choice/顺序 | 局部合同，窗口review |
| in-game-menu.boundaries.test.ts | system confirm/switch字段与id反查，不等同driver goto-out | 局部合同，窗口review |
| in-game-menu.glm-phase1-leaves.test.ts | 环绕/负默认值/系统词表；一条标题仍含未执行词表断言 | 注释需合入准确正文，review |
| magic-select.ts | in-game-magic唯一生产建表caller；MP与ObjectID排序 | C2调用域影响，review |
| magic-select.boundaries.test.ts | MP恰等/差1、排序不污染原roles、295与magicNumber分离 | 局部合同，窗口review |
| magic-select.glm-phase1-leaves.test.ts | 缺magic防御/免费0cost/缺名/空表 | 局部合同，窗口review |
| __tests__/item-magic-select.test.ts | R3Partial flags补全已清cast；item工厂无生产caller | R3修正接受，不代表test-only代码应保留 |
| in-game-magic-menu.ts | 完整四相/静态caster/目标clamp；outside预过滤与C矛盾 | C2 高风险停线 |
| in-game-magic-menu.test.ts | 真实confirm/MP灰；battle-only隐藏oracle错误、JSON.parse any | C2/C5 rework |
| in-game-magic-menu.boundaries.test.ts | 单/全体分相与roleId请求；只证意图不证script | review，依赖C2 |
| in-game-magic-menu.glm-phase1-leaves.test.ts | static显式复位、空表/关后refresh；部分缺role输入为防御 | review，依赖C2 |
| inventory-action-menu.ts | driver的装备/使用二项公共状态机，WORD22/23 | 局部合同，窗口review |
| inventory-action-menu.test.ts | 固定WORD/顺序/default1与上下切换 | 局部合同，窗口review |
| inventory-action-menu.glm-phase1-leaves.test.ts | 词表/reset、越界/空表防御、两次Down环绕 | 局部合同，窗口review |

## 97–102额外实际全文读取

| 文件（packages/game/src相对） | caller / oracle / 当前判断 |
|---|---|
| core/menu/primitives.ts | 多菜单move/confirm复用成立；Page/Triple/Switch生产caller缺失与错误primary注释C5，review |
| core/menu/item-select.ts | matchesFilter供equip/sell/draw，泛型factory只测试；C5错误位说明，review |
| core/menu/__tests__/primitives.test.ts | 上下环绕/disabled可停/default clamp/视窗；page测试不证明当前生产caller，review |
| core/menu/primitives.boundaries.test.ts | 空表/单项/快照/跨页窗口，合法pure state，局部成立 |
| core/menu/primitives.glm-phase1-leaves.test.ts | C5 enabled目标伪装disabled，rework |
| core/menu/item-select.glm-phase1-leaves.test.ts | C5否决位混淆；factory没有当前生产caller，rework |
| core/menu/opening-menu.ts | bootstrap/driver/draw真实消费，WORD7/8；C3取消链在driver，review |
| core/menu/player-status.ts | driver/battle创建，present读取；party副本/done/no-wrap与SDL一致；currentRoleId test-only留E6 |
| core/menu/opening-menu.test.ts | 词表未载fallback、new/load映射与环绕，局部成立 |
| core/menu/opening-menu.glm-phase1-leaves.test.ts | C5重复choice、词表restore与空表防御，rework |
| core/menu/player-status.test.ts | 快照隔离/越界退出/取消done幂等，局部成立；非生产role域示例须限定 |
| core/menu/menu-driver.ts | 全1047行已读；11种state dispatch/caller注入/脚本与存档责任；C3/C5/异步写gs风险，review |
| core/menu/menu-driver.test.ts | 全657行已读；多处非法cast/弱遍历找菜单、标题goto-out误注释，rework |
| core/menu/menu-driver.cov85.test.ts | 全1007行已读；精确多键/真script好于布尔覆盖，但C5重复库存与C3缺oracle，rework |
| core/menu/save-slot-menu.ts | driver三入口fetch一次owned state，present每帧读；关闭后仅改废弃局部对象，无证据称全局污染；过时注释待修 |
| core/menu/save-slot-menu.test.ts | full GameState/真实内存Save有效；C5模拟算法不算driver证据，rework |
| core/menu/save-slot-menu.glm-phase1-leaves.test.ts | defaultSlot id而非index与空表防御成立；错误IDB注释，review |
| core/save/api.ts | bootstrap/driver/menu/tools消费者；双clone/in-memory与IDB切分已读，C4依赖主路径+错误头注释，review |
| core/save/indexed-db.ts | open/upgrade/四请求/缓存/reset全文；C4已证反例，rework |
| core/save/__tests__/api.test.ts | 8例使用真GS与内存Map，主路径/abort缺口；只作内存路径局部证据 |
| tools/quick-save.ts | bootstrap注入Save/loadGameFromSlot，键监听返回disposer；C4写成功语义继承、错误与清理缺oracle，review |
| tools/quick-save.test.ts | C5非法partial GS/真实toast未清理、异步反馈缺口，rework |
| tools/toast.ts / toast.test.ts | 真DOM/toast timer与fake timer测试；不能代替quick-save分支选择证明，邻接证据 |
| core/menu/menu-save-chain.glm-msio.test.ts | 真driver跨槽7→8及保留原槽、同帧取消优先，替代simulateSave，邻接证据 |
| core/inventory-state.ts | addItem按id合并/99封顶/0删除，直接否定cov85重复库存合法性 |

caller补读范围：bootstrap:1080-1125/1620-1788，scene-system快捷键入口，battle-system状态页入口，present/menu/draw-opening-menu全文、draw-inventory选色、draw-menu存档元数据消费，shared Item/PlayerRoles/GameState类型，makeRole工厂全文。这些**caller段落**不冒充bootstrap/battle-system/present整文件专项闭合。primary直接读SDLPal ui:480-580、uigame:90-242/1260-1290、magicmenu:320-415、global.h物品枚举，以及前轮已核itemmenu/play调用段。CLAUDE/AGENTS/agent-workflow/治理总纲/账本/当前与历史批次卡作为上下文。

## 机械一致性

30条candidateSha和mainSha逐个与当前树及origin/main核对，30/30匹配；但7条byteIdentical/sourceChanged布尔仍是旧值（具体路径见mechanical-proof）。不能让`reworkCounter`新SHA与旧字段相矛盾。应保留旧closure事实，明确旧字段所属revision或按现行候选重算，不能写“27/30旧字节相等”作为当前断言。未编辑作者manifest原件，本反证记录当前差异。

## 独立运行与质量门

- 定向/相邻合并：36 files /323 tests，exit0，无stderr；精确argv/cwd/候选见`codex-r2-targeted-command.json`。
- game typecheck：exit0，无诊断。
- game全包：完整独立资源副本后 **312 files /3525 tests，exit0，无诊断/跳过**，见`codex-r2-adjacent-game-full-assets.txt/.exit`。前两次因缺完整资源分别exit1，原件保留；不是产品回归通过。副本3041文件的来源/聚合hash见full-assets.json，没有写主工作树或重生成。
- 两个独立counter探针：exit0，正控和反证均成立；不纳入官方测试数量/基线。
- lint-zero：4021文件，0 errors/0 warnings/0 infos；docs 48测试及导航/版本/content-review均PASS；ledger PASS 3267/229/44/2994。新证据追加后的最终静态复验另留sync回执，不用旧数代填。
- 全仓check/official ratchet/protected：本轮未重跑；已有回执含上述真实诊断，**未干净通过**。不合main，不标任何逐文件closed。
- 视觉：本轮无产品改动，不做视觉验收声明；新机制卡实施后Codex按功能界面最小验证，pal.exe最终观感另核。

## 下一位GLM提示词（可直接复制）

接手最新远端codex/code-quality-menu-integration，先fetch、核工作树与Owner，阅读CODE94/95、97–102顶部Codex R2及本报告、AGENTS/CLAUDE/agent-workflow和phase1真值。94、97–102均counter/rework；95仅三份fixture局部accept，仍review，不标done/已验证。

按C5修当前卡白名单内已证的错误注释、残缺fixture、重复合同和弱反例；保留真实caller/oracle/合法输入/排重/隔离/反控证据，少而精，不能为了保护digest留下已知坏测试，也不能为减pending强关。先核test-only Page/Triple/Switch/item工厂实际调用域，公共出口删除另走准入；不按重复次数机械提取helper。三个新GAME高风险卡仅draft，先完成事实/方案/白名单的Codex build准入，**不得开始实现机制或IDB修复、不得改save schema/DB版本/清档策略/公共接口**。集中editor诊断另核Owner，不越界静音。先做定向/相邻/typecheck，按完整模块窗口再统一check/ratchet/真实protected/lint/docs/ledger；原件保留exit和所有诊断。分批提交推送、交Codex独立复验；不得合main或宣称全仓治理完成。

## 主线推进观察

本轮验收完成前再次fetch，origin/main前进到8f5d17ff1（音乐功能3提交）；原候选此时3behind/12ahead。先提交推送本review检查点，再同步主线；上述3525全包结果严格属于1f8bcd468候选，不冒充同步后全门。合并同步后的新账本和验证另追加，不更改历史3267口径。

回执展示文本仅规范行尾空白；同名raw.json保存完整原始combined output、SHA、字节数与真实exit，未过滤诊断。机械诊断统计取GLM未改原件。

## 同步最新主线后的候选（2026-10-15）

验收检查点25d2d3c42已先推送两条治理/验收分支，再合并origin/main=8f5d17ff1到隔离分支，未把治理合入main。保留音乐卡、两边证据/任务历史与逐文件review；当前ledger **3283 inventory /229 closed /44 review /3010 pending**，新增16项音乐记录均pending，0新闭合。旧3267数字仅属于1f快照。

coverage baseline存在双边生成结果冲突：采用**当前origin/main的canonical baseline完整原字节**作为未验证候选的比较起点，没有手工拼计数/hash或导入旧治理baseline。新候选尚未官方ratchet/真正protected通过，必须重新跑官方工具；此处理不授予覆盖率通过或恢复文件闭合。CODE93/96旧分支没有整条引入。

当前packages中本review未添加实现；音乐修改只来自main同步。原菜单30路径与1f逐SHA比对保持不变；同步后另跑game全包、game typecheck、新增RIX提取/CLI定向与coverage工具回归，结果以codex-r2-sync-*原件为准。全部check/ratchet/protected仍未干净通过，不合main。GLM从当前远端治理分支继续，先核最新main，不回旧detached工作树。

### 同步后实际终态

- game全包 **317files /3558tests，0skip，exit0**；提取器 **5files /28tests，exit0**；coverage工具 **59/59，exit0**；game typecheck exit0。各原件无act/导航诊断。
- lint **4073files，0errors /0warnings /0infos**；docs 48测试及1249文档/380任务导航PASS；版本/phase-lore/content-review均PASS；ledger **3283/229/44/3010**。
- CODE94的30条及额外实际完整读取文件共57份，与1f逐SHA复比全部未变；bootstrap音源增量与当前quick-save接线补读，Save链未改。回执SHA见sync-source-proof/sync-validation.json。
- 全仓check/official ratchet/真正protected：本轮未重跑；旧回执仍带已证诊断，新合并候选覆盖率未验证，**不得宣布统一门或阶段集成通过**。当前只把main同步到治理分支，不把治理合main。
- 先推送25d2d3c42再同步main；最终同步提交推送到同两分支。下一步GLM先修C5有限测试/注释，三个高风险卡先核build准入；本轮验收不自动继续全仓实现。
