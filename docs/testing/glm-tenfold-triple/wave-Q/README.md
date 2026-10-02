# Wave Q：两阶段runtime与解码残余合同十倍包 — GLM Q 交付总账（r13 fizzle 合法化）

Coding Owner: GLM Q；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)、Codex 2026-10-01 独立审查 `docs/testing/glm-tenfold-triple/codex-review-20261001.md`（落盘于审查树 codex/glm-lmn-acceptance-r1；按不 cherry-pick 纪律未拷入本分支，机器证据 codex-review-20261001.json 同）。
分支 `codex/glm-wave-q-runtime-residual-r1`（独立 worktree），派发提交
`8b3ca062953b17a12178f8d1a9e36657971234b1`，生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`，
起点候选 `626ddffe41cca4e3755dfafea1645c695c158b0f`（r1，被 counter → rework）。
本文件描述 **r13 候选**（r12 复核 Q-R12-01/02 闭合；已关闭项不重开；
r12 候选 1c752fc2/pin 08ddbf06 保留供独立复核）。不合 main、不标 done。

## r13 相对 r12 的改动（Q-R12-01/02）

1. **Q-R12-01 fizzle 合法化**：两个 fizzle 例改**真实 runScript**（event-system 导出，
   非 mock）+ 合成最小合法失败脚本 `[end, raw 0x41, end]` entry 1（0x41 =
   mark-script-failed，script.c:1623-1627 在真实 runner 内置 fScriptSuccess=false）。
   断言补齐：无越界 warning、fScriptSuccess 真实为 false、动画 0、施法音 9 入
   pendingSounds、magicSound 0 不初始化通道。r12 版的 mock 手置旗 + 越界 entry 42
   废弃。
2. **Q-R12-02 删重**：r12 的两个 enemy 例删除——「无 gs 脚本照跑/动画」已由旧
   actions.test.ts「敌人 cast→不扣 MP+仍 emit+仍 runScript」（:1859-1894，无 gs、
   精确单动画/callback 次数/ctx）更强直证；「未建链即时施法音」已由 M6 旧例
   （:1297-1342，敌 cast 音 62+效果音 55 完整数组）直证。FZ3/4/5 退役保留历史，
   不换音效 id 充新。文件头「数字缓冲」未交主张撤回（本文件无数字 oracle）。
3. **账目**：140→**138 执行**（r12 新增 4 例未接收；本批净 2 例合法 fizzle 亦待
   Codex 接收）；**合法性结构上限 135 / 缺口至少 565**（r12 的 139/561 随未接收
   4 例一并修正）。反控 **63 存档 / 54 执行目标 / 净新结构上限 53**；FZ1/FZ2 在
   合法文件上重采全 VALID。

## r12 续批（历史；其中 4 例已按 r12 复核修正/删除）

- **描述同步（r11 复核遗留，不重采针）**：FP3 索引 axis 修正为 '1 sprites, 0 frames'
  （meta/断言早已如此，仅索引字符串旧值）；yj2-encoder 终止符注释更正为 8+6 bit
  （扩展段 = data2-2；此前多的 2 个零位在真终止之后属 padding，严格流本就有效）。
- **Q08 新批**：`battle-magic-fizzle-audio.glm-q.test.ts`（4 例 typed 零强转）——
  ①fizzle（scriptOnUse 失败）施法音仍即时播（fight.c:4184 vs 4215 真值；旧例未断言
  pendingSounds）；②magicSound=0 不 push 空 promise 音（pendingCastSound>0 门）；
  ③敌方 cast 无 gs：施法音缓冲跳过、脚本照跑；④敌方 cast 施法音即时回落（未建链
  路径 enemy.magicSound 即时 push，fight.c:4695）。**Q-FZ1～5 五针**三态全 VALID。
- 规模更新：**140 执行 / 19 文件 + 2 fixture / 66 存档（56 执行目标，净新结构上限 54）**；
  结构净新用例上限 139（扣 C114）/ 缺口至少 561。
- 门禁：pal-extract 363 / game typecheck 0（新文件）；三包串行全测与全量门禁见末批。

## r11 当前结论（历史）

- **136 执行 / 结构净新上限 135（仅扣已登记 C114 旧 room0 cross-check）/ 缺口至少 565**。
- 反控：**61 存档满足业务单断言红 / 52 个不同执行目标 / 净新合同目标结构上限 51**
  （C114 与 S1-RC4 是**同一**旧 room0 合同及其反控，只扣一次）。FP4 是把原共享
  全管线身份**重定**为独立边界拒绝目标（目标 +1，非新增存档）；FP1/2/3/5 为同一
  目标四条输入轴。原 50 数量门已足，不再补针。
- 三态来源（r11 真实差分）：**51 组业务证据未变 + 5 Q10 更新 + 5 FP 更新 = 61**。

## r11 相对 r10 的改动（Q-R10-01～02 闭合）

1. **Q-R10-01 fixture 收窄**：`yj2-encoder.ts` 删除未用的通用回引接口
   （Yj2Backref / 可选 b0/b1 / pos 反查 API）——Codex 独立严格读流证伪了 r10 的
   LZSS 扩展位宽（写了 data2 位而 primary 解码读 data2+6 位，回引后多 2 bit 错位：
   literal7+回引+literal9 末字节 178 非 9）。CLI 只需 literal-only 流 + 0xFFF
   终止符（该路径已被 Codex 严格 EOF/回引/输出边界与真尾标独立验证合法），保留为
   `yj2EncodeLiterals`；**撤回 r10「回引全往返」主张**（该声明基于的 40/128/回引
   往返测试从未进入提交）。不造产品级编码器、不改生产 decoder。
2. **Q-R10-02 账目**：61 存档（r10 误写 62——FP4 重定目标不新增存档）/ 52 执行目标 /
   净新结构上限 51（room0 只扣一次）；136 执行扣 C114 → 结构上限 135 / 缺口至少
   565（r10 的「净新 134/缺口 564」是拿执行数相减的错误，已纠正）。C134 改记
   FP4 独立目标（非「该目标多轴」）；FP3 axis 修正为 '1 sprites'（正控已同步）；
   CLI helper 注释与 PAT 断言尾注（254 溢出残留）更新为真实最终构造；历史段保留
   并标注 r10 计数错误已被 Codex 修正。
3. 受影响 **10 CLI 针重采**（fixture 依赖字节变化）全 VALID；其它 51 组不动。

## r10 历史段（保留；其中 62 存档/净新 134/缺口 564 计数已被 r11 纠正）

## r10 相对 r9 的改动（Q-R9-01～03 闭合）

1. **Q-R9-01 合法 YJ2**：新增专属 fixture `src/__tests__/glm-q/yj2-encoder.ts`——
   按 primary `reference/sdlpal/yj1.c` 对偶实现的**自适应 Huffman + LZSS 编码器**
   （同一初始树/adjustTree/0x8000 归约镜像，支持已产出数据回引与 0xFFF 终止符），
   合法性由**产品 decoder 往返验证**（40/128/65536 字面量 + 回引 + 终止符全往返
   逐字节相等，r9 的 68B 零流依赖 EOF 越界读/负回引归零的非法性被完全替代）。
   MAP chunk 改用该编码器产出的合法 65536B 全零图（cell 全 {0,0}，不再固定
   lower=130）；PAT 通道全部 0..63（色 1 = [1,2,63] → 8bit [4,8,255]）。
   空资源（FBP 空档、MGO 空组、无 BDF）只作为如实登记的跳过路径，不泛称非空
   图形合同已证明。
2. **Q-R9-02 FP 真轴**：FP2 改为 MAP chunk0 非空→空（非空扫描跳过 → tilesets
   2→1 真业务轴）；FP3 改为 MGO 1→2 个**合法 YJ2 sprite**（数量 1→2 真轴，
   正控断言同步 1 sprite）；FP4 独立为**如实登记的边界拒绝合同**（FBP 3 chunk
   → readChunk "MKF: chunk 3 out of range" 精确拒绝 + exit 1，变异轴验证判别力），
   不冒称合法正向资源。
3. **Q-R9-03 账目**：FP1/2/3/5 承认为同一 file×fullName 的多轴（不是五个目标）；
   结构修正为 62 存档 / 52 执行目标 / 净新上限 50（含 FP4 新目标）——原 49→50
   由这一个真新目标补足，未拆标题凑数。

## r9 历史段（保留）

- **135 执行 / 净新上限 134 / 缺口至少 566**（C114 旧 room0 cross-check 不计净新；
  r9 新增全管线 1 例为净新）。
- 反控：**61 存档满足业务单断言红 / 55 个不同执行目标 / 净新合同目标上限 54**
  （C114/S1-RC4 旧合同不计新）。r9 新增 Q-FP1～5 五枚**全管线新合同目标**针
  （PAT 去夜间板/GOP chunk0 置空/ABC 加可解 chunk/FBP 截短越界/palette 色值轴），
  直接回应「余族至少补 1 真新目标」——已补 5。
- NT8 退役（Q-NT8.retired.meta.json 保留历史）；三态来源：45 旧针未变 + 5 Q10 更新
  + 5 S1 更新 + 6 NT + 5 FP（+1 NT8 退役）。
- C115 分类已按已修源码更新；game 2805 / lint 以本轮最终复跑为准。

## r9 增量批：Q10 全管线合成（走到底）

`cli-isolated` 新增 `buildFullPipelineInputs`：MAP.MKF 用 **YJ2 零流合成**
（header=uncompLen + 64B 零位流 → 实测解出任意长度全初始符号输出；65536B 全零
map 经 parseMap 走通，cell lower=130/upper=0），GOP 用 encodeSpriteChunk（chunk
需与 scene mapNum 对齐——parseMap 在 YJ2 try 外，短 chunk 未捕获抛出），PAT 768/
1536B 调色板（6bit→8bit 扩展断言 [4,8,255]），MGO/F/ABC 空 MKF、FBP 5 chunk
（splash 需 chunk3/4 存在）、无 BDF（warn 跳过）——CLI **完整走到底**：
exit 0 + tilesets 2/2 + palette 2 chunks + asset-manifest + done。

## r8 相对 r7 的改动（历史）

- **当前规模：134 执行 / 57 针存档（50 个不同 file×fullName 目标）/ 18 文件 + 1 fixture /
  10 流程**；game 全包 **2805**（Codex 独立实跑数，作者上轮报 2804 系 1 例口径差，
  本轮以 2805 为准）。
- **50 不同目标已达成**（Q-R7-04）：新增 Q-NT1～NT6/NT8 七枚不同目标针；剩余 7 组
  同目标存档（Q03-RC2/3、Q09-RC3/4、Q10-RC1/2/5、Q10-RC3/4、Q08-S1-RC2/3、
  NT8-与-Q05-RC3 同例）如实保留为同目标多轴证据，不计不同目标。
- **剩余缺口：至少 566 例 / 完整 50 组账未闭合**；不整族缩围，逐项举证继续。

## r8 相对 r7 的改动（Q-R7-01～04）

1. **Q-R7-01 根治**：contracts 生成器加**例级 override**（按 fullName 匹配优先于文件
   模板）——C104～C111 八例（投影链/silence/selectingPlayerIdx/resolve/极限技/MP 门/
   择优替换/同威力先遇）真账实落 blob，已实查验证不再被模板覆盖；C114（活敌例）与
   C115（底锚例）也落例级真账。
2. **Q-R7-02 收窄**：0x9E 首例收窄为两个旧证未覆盖的独立轴（非空毒残留清零 +
   objectId 身份替换），旧证锚（battle-opcodes.test.ts:1459-1479）在用例注释中引用；
   「活敌槽绝不复用」整例在 contracts 改记 existing-proof cross-check（不计新）；
   「底锚重算」改**一手固定坐标 oracle**（sdlpal g_rgEnemyPos fallback 常量，
   不再用产品 getEnemyBasePos 计算 expected）；Q08-S1 五针随源变动全部重采
   （RC5 改 refresh 前偏移轴恰一红）。
3. **Q-R7-03 账目**：三态来源分列——34 旧针（r6 前）未动 + 6 Q08 针 + 5 Q10 针随源
   更新 + 5 S1 针重采 + **7 NT 新针**；不再称「旧 39 全部未动」。
4. **Q-R7-04 补目标**：Q-NT1（FIFO 第三枚改 Yes）/NT2（初始集改 [b,b]）/NT3（毒
   script 值）/NT4（prune 保护集加 a）/NT5（gzip 视图起点 4→3）/NT6（callScript id
   probe→other）/NT8（hook summon 目标→ghost 精确报错）七枚不同目标，全部恰一业务红。

## r7 历史段（保留）

## r6 复核后当前结论（历史）
- 已删的 performItem 两例不再计入；capture 误设行（10b）已按 N/A 关闭、**不再续派**。
- **剩余缺口：至少 566 例 / 0 针 / 完整 50 组账未闭合**（50 有效反控目标已达成数量，
  组账与用例缺口继续逐项举证）；不整族缩围。

## r7 相对 r6 的改动（Q-R6-01～03）

1. **Q-R6-01 合同账**：contracts.json C104～C110 逐例改写为真实 source
   （pickAutoMagic battle-system.ts:1048-1080 + hydrate :1394-1432 + project
   :1577-1670）、生产 caller（bootstrap.ts:1197-1201）、旧断言锚
   （battle-system.test.ts:1089-1119 仅两条 signed-negative）、逐例精确 oracle 与
   输入轴；classification 不再沿用库存/扫描模板。
2. **Q-R6-03 因果纠正**：costMP=1 臂标题改为「极限技门（sdlpal uibattle.c:763-766）」；
   威力择优例补充明确「更高 baseDamage 替换」前提；**新增同威力保留先遇一例**
   （两法术 baseDamage 同 30、range=0，strict `power>maxPower` 不替换 → 返回先遇 296），
   该行为正是 RC7 变异的真实因果，现在有直接正向用例锚定。
3. **Q-R6-04 针目**：RC7 axis/标题改为真实因果（同威力保留先遇，非「更高威力」）；
   本文件六针随测试源变动全部真实重采；未变旧 39 枚保留。

## r6 相对 r5 的改动（Q-R5-01～04，历史）

1. **Q-R5-01**：selectAutoTargetFrom 两例 fixture 完整 typed 化——`slot()` 构造
   BattleEnemy 全必填字段（status 五项/prevHp/scripts/poisons），仅健康轴可变；
   四处空 status 强转与两处缺字段数组强转删除。
2. **Q-R5-02**：performItem 缺 entry / count=0 两合同与 `actions.test.ts:2317-2371`
   同源同断言（warn/库存不变/脚本不执行），删重不计新；同 describe 保留 throw-item
   无 inventory 合同（旧测未覆盖）。
3. **Q-R5-03 撤回并展开**：pickAutoMagic blocked-input 表述撤回（ledger r6 修订段）；
   按一手链 `createInitialGameState → hydratePlayerRolesRuntime(rgwMagic 32 槽)
   → projectRuntimeToBattleRoles`（tables.ts:560-562 / game-state.ts:1425-1432/:1670 /
   bootstrap.ts:1197）展开七例：投影链真值/silence 门/selectingPlayerIdx 缺席/
   resolve 失败/costMP=1 哨兵/MP 不足门/威力择优；signed-negative 两例不重复；
   `learnedSpells` fallback 未获授权不测。
4. **Q-R5-04**：受影响针处理——Q08-8b-RC3（已删合同）退役除名、RC5 随新 fixture
   重定重采、RC6/RC7（silence/costMP 轴）新增；本文件六针三态全 VALID；
   **45 枚**索引全 VALID 且逐枚哈希对齐最终树；未变 39 枚原证据保留。

## r5 追加批（历史）

- **8b 展开**：`packages/game/src/battle-action-error-arms.glm-q.test.ts`（typed driver
  零强转，7 例）——performMagic caster 索引越界/role 缺失两臂（warn 原文+不扣 MP+不
  emit+不跑脚本）、performItem/performThrowItem 无 inventory 三臂（count 缺失与 count=0
  保留 entry 两形态；不跑脚本、inventory 原样）、selectAutoTargetFrom begin<0 规范化与
  prevTarget 越界回扫两臂。反控五轴 Q08-8b-RC1～RC5 三态全 VALID。
- **10b 收敛为 N/A**：`grep -ri capture packages/game/src`（排除测试）零公开符号——
  本引擎战斗公开面无捕获机制入口，r2 建行未核源条件，改记误设行关闭（非停线轴）。
- **blocked-input 登记**：pickAutoMagic 学习法术系臂（MP 门/costMP=1/resolve 失败）——
  `getLearnedSpells`（battle-system.ts:1033-1037）内部反射读 `role.magic`，共享
  `PlayerRole`（tables.ts:482）未声明字段 → typed 输入无法合法设表，需产品侧补 typed
  字段后开测，不夹产品修改。`selectAutoTargetFrom` 六臂旧测已证（existing-proof）。
- 证据：`counters.json` 44 条全 VALID；`q07-q08-contract-ledger.md` r5 段。

## r4 相对 r3 的改动（对应三审 Q-R3-01～04，历史）

1. **Q-R3-01 总索引同步**：`counters.json` 由最终 per-counter meta 重建——五枚 Q10
   条目 original/restored 现为 `e46949e5…`（与候选树实际文件一致），构建脚本内建
   「index==meta==实际三态 SHA256 逐枚断言」校验（mismatch 即失败）。
2. **Q-R3-02 格式诊断**：Q10 五枚×三态 JSON（15 诊断）正常格式化；最终 lint 数值
   按当前树重跑回填（不以历史 2925 报告冒称）。
3. **Q-R3-03 元数据与合同账**：receipt `candidateHead` 只放完整 40 位测试提交 SHA，
   docs-only 说明独立 `candidateHeadNote` 字段（r3/r4 口径）；`contracts.json` 重建为
   **116 条**（补 3 条 Q10 CLI 合同；修正 C099～C113 的 package=game/仓库路径归属；
   file/fullName 与最终实跑逐条对应），每条落真实 source/caller/oldAssertion/axis/
   oracle/classification 锚点（非模板）。
4. **Q-R3-04/COMMON-01 账目同步**：`q07-q08-contract-ledger.md` 按三审裁决——第 6/8/10
   行 existing-proof 范围逐条收窄加范围注记，拆出 8b（performAction/selectAction）与
   10b（captureEnemy）「展开中」行；第 4/11 行不再以 reforge 文件作 game 证明；删除
   「headless 不可达」泛化与整体缩围申请，改逐项举证 + typed game driver 展开计划；
   capture 家族旧锚（actions.test.ts performFlee 五例）已补入第 10 行。

## r3 相对 r2 的改动（对应二审 Q-R2-01～04，历史）

## r3 相对 r2 的改动（对应二审 Q-R2-01～04）

1. **Q-R2-01 反控重采**：Q03-RC1～RC4 在最终格式化 audio 文件（`5f1f78ff…`）上真实重采
   三态（正/变/恢复各 JSON+raw+退出码+执行数，恰一目标 AssertionError）；**全部 39 枚**
   （原 34 + Q10 新 5）的 original/restored SHA256 与最终候选文件逐一复核相等
   （v2 执行器自动判据 verdict=VALID×39）。判据按二审纠正保留 `Error: promise resolved…`
   原文（实为 rejects 业务断言，不判环境红）。
2. **Q-R2-02 超时**：`cli-isolated` 两条 60000 超时删除（现存 0 处），默认门下子进程
   失败/取消正常收尾；CLI 两例 + DATA 新例 + pal-extract 全包/typecheck 复跑绿。
3. **Q-R2-04 元数据**：README Q01 行改「6（+fixture）」，各行合计 16；receipt
   `shortfall.deliveredCases=115`（r3 增 1 后 116，随树再生成）；`candidateHead` 用完整
   40 位测试候选 SHA，docs-only 说明放独立字段 `candidateHeadNote`。
4. **Q-R2-03 继续合法残余**：
   - **Q10 DATA 段解锁**：`buildDataMkf()` 合成 15 chunk 最小合法表（STORE 18B/
     ENEMY 70B/TEAM 10B/PLAYERROLES 900B SoA/MAGIC 32B/FIELD 12B/LEVELUPMAGIC 20B/
     SPRITEUI=encodeSpriteChunk 正向构造/effect 同构/BATTLEEFFECTINDEX 40B/dialog icons
     282B/ENEMYPOS 100B/LEVELEXP 200B），CLI 走完**数据表段**：逐表落盘（stores 首零截断/
     magic/enemies/roles spriteNum 真值回读/level-up-exp 100/fields/dialog-icons 282B/
     ui frame PNG/effect blob）后于图像段边界缺 RNG.MKF exit 1 ENOENT 精确拒绝。
   - Q07/Q08 账按二审意见收敛：`q07-q08-contract-ledger.md` 第 6/8/10 行替换为逐条件
     完整 old fullName 锚；reforge 证据误引两行更正口径；battle-session 集成相位改列
     「integration-heavy（待 typed session-driver 逐合同展开）」，不作为缩围依据。
     后续批次按同口径继续展开余族。

## r2 相对 r1 的改动（对应审查 Q-01～Q-04 / COMMON-01，历史）

1. **Q-01 类型桥清零**：`audio-spessa-runtime.glm-q.test.ts` 重写——替身类提至
   `vi.hoisted`（`WorkletDouble`/`SequencerDouble` 真实类），实例直接进 typed 数组，
   观测按类字段断言；删除 r1 的 162/239 两处 `as unknown as` 反射跳板与伪 `self` 容器。
   全文件 0 `as unknown` / 0 `as never`（typecheck 0 error）。
2. **Q-02 实跑 JSON**：`directed-vitest.json` 改由 **最终实跑**
   （`vitest run glm-q --reporter=json`，reforge+game+pal-extract 三包）生成：
   16 文件 / **115 例** / `file × fullName × status × duration` 逐条 + 总执行数
   （115 passed / 0 failed）。不再使用 `vitest list` 枚举。
3. **Q-03 反控三态实跑**：34 枚全部重采集——每枚三态（正控/变异/**恢复后重跑**）
   各有完整 Vitest JSON + raw 输出 + exitCode + 执行数；变异态恰一名目标 fullName 红
   且 AssertionError 首行入账；三态 SHA256 与最终候选文件一致。
   `counters.json`（`perCounter[].criteria` 全绿 verdict=VALID×34）+ `counters/`
   （每枚 10 文件：meta/axis/patch old+new/三态 json+txt）。
   另：`video-sfx-ports` 补跨用例 DOM 清理（防变异路径泄漏放大失败面）。
4. **Q-04 数量与视觉**：数量统一为 **16 个新 `.glm-q.test.ts`（reforge 13 + game 2 +
   pal-extract 1）+ 1 个专属 fixture**（`src/__tests__/glm-q/shop-project.ts`）；
   r1 README 头部「7+1」为 Q01 批次口径、表内「15 含 fixture」为打包口径，r2 统一。
   F1 **如实撤回** r1 的「autoplay 被拒→点 overlay 恢复」表述：无头 Chrome 对 autoplay
   策略参数行为不确定（同参数多次启动拒绝/放行不一致，实测见 drive-q 脚本注释），
   F1 改为记录真实行为（媒体播放 + 跳过取消链 + 到达菜单）；浏览器层不做恢复臂宣称，
   该合同由 N03 jsdom 用例「autoplay 被拒：点击 overlay 后重试成功并移除 overlay」覆盖。
   10 条流程重跑全过（11 张截图 SHA256 重采）。
5. **COMMON-01 续做**：
   - **Q10 解锁**：`packages/pal-extract/src/cli-isolated.glm-q.test.ts`——cli.ts 的
     REPO_ROOT 从模块位置派生（`cli.ts:74`），**mkdtemp 复制模块树**（src 拷贝 +
     package.json + symlink node_modules）+ 合成最小合法输入（SSS 5 chunk /
     WORD.DAT 565×10B / M.MSG），子进程实跑 `tsx src/cli.ts`：①事件管线成功路径
     （round-trip 门、切片落盘 scene-000/shared/objects/all、giveItem 词表注记、
     数据表阶段缺 DATA.MKF 以 exit 1 ENOENT 拒绝）；②截断 SSS chunk0 在解析边界
     精确拒绝且零事件产物。不写真实 raw/extracted、不运行主工程生成。
   - **Q07/Q08 逐合同账**：[q07-q08-contract-ledger.md](q07-q08-contract-ledger.md)
     对 22 个公开合同族逐条给出旧断言锚（file :: fullName）或
     blocked-story / integration-heavy / stop-line 判定，申请 Codex 裁决缩围；
     700 总目标不自行缩减。

## 交付规模（r10）

**136 例 / 18 新测试文件 + 2 fixture（shop-project + yj2-encoder）/ 62 枚三态有效反控 / 10 条非剧情浏览器流程 /
1 个缺陷红诊断（Codex 已独立确认，另列产品 draft）。**

### 续批1（fa0eebb9）：0x9E 正向死亡空槽复用

`battle-summon-slot-reuse.glm-q.test.ts` 4 例（typed 零强转）：战中击败槽复用
（满血重置/毒清零/对象身份与脚本替换）、同席两死亡槽 count=1 只复用一间、满员
room=0 fail jump 300、复用后底锚重算（固定基准断言）；Q08-S1-RC1～5 三态全 VALID。

### 续批2（a9b262370）：Q10 图像/音频段

`cli-isolated` 增 `buildImageStageInputs`：RNG 空 sub-chunk（blob 仍写、manifest
frameCount=0）、RGM/BALL 合法 2×2 RLE（file header 0x02000000）、FIRE 空 MKF、
SOUNDS 空 chunk skip + 数据 chunk 原样、Musics/（7.MID→007.mid、TRACK02.ogg 原名）；
缺 FBP.MKF 在 splash 段边界 exit 1 ENOENT。Q10-RC1～5 在变更源上重采全 VALID。

| 批 | 域 | 测试文件 | 用例 | 反控 |
|---|---|---|---:|---:|
| Q01 | reforge 非剧情 boot/menu/gallery/trial | 6（+fixture） | 40 | 5 |
| Q02 | loader/manifest/catalog/map/缓存 | 3 | 24 | 5 |
| Q03 | bgm/midi/sfx/video IO（spessa/midi-preview/video/sfx） | 2 | 15 | 5 |
| Q04 | script-runner 光标/callScript 门族 | 1 | 13 | 5 |
| Q05 | battle 敌方可达闭包 | 1 | 6 | 5 |
| Q06 | game status 毒槽/装备派生值 | 1 | 11 | 5 |
| Q07 | game 事件/opcode | （见逐合同账） | 0 | — |
| Q08 | game 战斗（8b/10b/pickAutoMagic/0x9E 死亡槽复用） | 2 | 17 | 11 |
| Q09 | game framebuffer 呈现端口 | 1 | 4 | 4 |
| Q10 | pal-extract CLI 隔离实跑（事件/DATA/图像音频段） | 1 | 4 | 5 |
| 合计 | | **18 + 1 fixture** | **134** | **50** |

## 700/50 缺口申报（r4 续）

- Q10 已解锁事件段 + DATA 表段；图像段（RNG/RGM/BALL/FIRE/MAP/MGO/ABC/FBP 的图形
  格式合成）为后续分段。
- Q07/Q08 逐条件展开继续：下一批首项为 8b（performAction/selectAction 逐条件锚）、
  10b（captureEnemy 全族）、11（game 战斗集成相位 typed driver 逐合同）及
  dialog/walkNPC 演出族；缺合法输入逐项举证，不整体缩围。
- 反控 50/50（数量达标）；用例缺口至少 566/700、50 组完整账未闭合——逐项举证继续。

## 排重与不可达登记

- 排重 basis 逐文件见下（r1 已建账，r2 未新增同形用例）：
  - `script-confirm-modal`：旧 4 例生命周期矩阵之外的生命周期臂。
  - `boot-page-shell`：H1 boot-flows 之外的页壳自身合同。
  - `opening-menu`：H2 flows/observation 之外的按键臂与缩略图 IO 时序。
  - `shop-trial`：旧 6 例之外的白名单接受臂、resize 钳制、blur 清键、Escape 终态 DOM。
  - `main.boot-shell` / `main.battle-preview`：H1/N01 之外的入口参数守卫、音频偏好、
    手势恢复、gallery 容错、field/enemies 参数臂。
  - `assets-decode-gates`：G03/battle-bg/presentation residual 之外的 battle-sprite 门、
    battle 缓存 label/origin.ref 失效、effect-sprite record 门、gzip 透传/偏移视图。
  - `runnable-project-loader`：corpus 0 命中，全源新覆盖。
  - `project-map-stamp-resize`：N01 之外的 stamp/resize/图层联动臂。
  - `audio-spessa-runtime`：适配器层旧测之外的初始化门族与浏览器 runtime 装配。
  - `video-sfx-ports`：N03/sfx staged-failures 之外的 muted/pause 容错/maxDecoded。
  - `script-runner-core.gates`：旧 21 例之外的非法光标组合、callScript 门族、
    host 缺 revealSceneEntry、while 前置条件序。
  - `enemy-closure`：corpus 0 命中，全源新覆盖。
  - `status-poison-equip`：opcode 层旧测之外的毒槽函数直测与派生值钳制。
  - `framebuffer-ports`：`createFramebuffer` 本体 0 直测命中。
  - `cli-isolated`：corpus 0 命中（cli.ts 此前零直测），全源新覆盖。
- defensive-unreachable：`ScriptRunnerCore` compilerVersion/boundaryPolicy tamper 臂
  （executable 字面量类型）、`commandOutcome` 运行时缺失臂（作者校验
  `author-script-core.ts:881-883` 锚定同 state）、`BaseSharedScriptResolver`
  timing/boundary 过期臂（按调用方参数现编）。
- D-Q01-1（enterLoad 未处理拒绝）保留待 primary/caller 独立裁决，不夹带产品修复。

## 浏览器实际操作取证（10 条，`browser-evidence/`，r2 重采）

真实 Chrome headless 1440×900 → `dev:pal`（真 pal 工程）；全程无 `__rfWorld`、
未选择开局项、未进入 PAL 001/002。F1–F5 键盘/媒体链、F6/F7 直返、F8 失败恢复、
F9 开店退出资源、F10 resize 重钳制——判据与截图 SHA256 见
`browser-evidence/browser-evidence.json`（`flows[].autoplayBehavior`/`overlayRecoveryClaim`
如实记录宿主行为与撤回声明）。

## 门禁结果（r2）

- 三包串行全测：reforge **2150**、game **2788**、pal-extract **360**（基线 357 + 3 CLI）全绿
  （数值以 r4 最终门禁复跑回填为准）。
- 三包 typecheck 0 error；根 `pnpm lint` 完整 **0/0/0**；`scripts/docs/check.mjs` PASS；
  `git diff --check <派发基点>...HEAD` 干净；`verify-targets.mjs --wave Q` frozenValid /
  Owner 交集 0（`receipt/verifier-final.txt`）。
- 覆盖对照（隔离 v8，同分母）：见 `coverage-delta.json`（pal-extract 为 glm-q 定向
  覆盖口径，已在文件内注明与全测口径差异）。
- **45 枚**反控三态实跑全 VALID（`counters.json` 总索引由最终 meta 重建并逐枚断言
  index==meta==实际三态哈希；Q-R5-04：RC3 退役、RC5 重定、RC6/RC7 新增）。
- r5 报 123 例含两条与 actions.test.ts 重复的 performItem 合同，r6 删重后以
  **directed 实跑 128 例**（17 文件 / 128 passed）为准；game 全包真实数 **2800/2800**
  （基线 2773 + glm-q 27）。
