# Wave Q：两阶段runtime与解码残余合同十倍包 — GLM Q 交付总账（r5 追加批）

Coding Owner: GLM Q；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)、Codex 2026-10-01 独立审查 `docs/testing/glm-tenfold-triple/codex-review-20261001.md`（落盘于审查树 codex/glm-lmn-acceptance-r1；按不 cherry-pick 纪律未拷入本分支，机器证据 codex-review-20261001.json 同）。
分支 `codex/glm-wave-q-runtime-residual-r1`（独立 worktree），派发提交
`8b3ca062953b17a12178f8d1a9e36657971234b1`，生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`，
起点候选 `626ddffe41cca4e3755dfafea1645c695c158b0f`（r1，被 counter → rework）。
本文件描述 **r5 追加批候选**（r2 二审 Q-R2-01~04、r3 三审 Q-R3-01~03、r4 Q-R3 追认均
闭合项不重开；Q-R2-03/R2-03 缩围未获批，按逐条件展开继续）。不合 main、不标 done。

## r5 追加批（Codex 直接派发：typed driver 展开 8b/10b + Q10 评估）

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

## 交付规模（r5 候选）

**123 例 / 17 新测试文件 + 1 fixture / 44 枚三态有效反控 / 10 条非剧情浏览器流程 /
1 个缺陷红诊断（Codex 已独立确认，另列产品 draft）。**

| 批 | 域 | 测试文件 | 用例 | 反控 |
|---|---|---|---:|---:|
| Q01 | reforge 非剧情 boot/menu/gallery/trial | 6（+fixture） | 40 | 5 |
| Q02 | loader/manifest/catalog/map/缓存 | 3 | 24 | 5 |
| Q03 | bgm/midi/sfx/video IO（spessa/midi-preview/video/sfx） | 2 | 15 | 5 |
| Q04 | script-runner 光标/callScript 门族 | 1 | 13 | 5 |
| Q05 | battle 敌方可达闭包 | 1 | 6 | 5 |
| Q06 | game status 毒槽/装备派生值 | 1 | 11 | 5 |
| Q07 | game 事件/opcode | （见逐合同账） | 0 | — |
| Q08 | game 战斗（8b/10b 展开） | 1 | 7 | 5 |
| Q09 | game framebuffer 呈现端口 | 1 | 4 | 4 |
| Q10 | pal-extract CLI 隔离实跑（事件段 + DATA 段） | 1 | 3 | 5 |
| 合计 | | **17 + 1 fixture** | **123** | **44** |

## 700/50 缺口申报（r4 续）

- Q10 已解锁事件段 + DATA 表段；图像段（RNG/RGM/BALL/FIRE/MAP/MGO/ABC/FBP 的图形
  格式合成）为后续分段。
- Q07/Q08 逐条件展开继续：下一批首项为 8b（performAction/selectAction 逐条件锚）、
  10b（captureEnemy 全族）、11（game 战斗集成相位 typed driver 逐合同）及
  dialog/walkNPC 演出族；缺合法输入逐项举证，不整体缩围。
- 反控 44/50：新增反控随新合同批次继续补足。

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
- **44 枚**反控三态实跑全 VALID（`counters.json` 总索引由最终 meta 重建并逐枚断言
  index==meta==实际三态哈希；Q10 三态 JSON 已正常格式化）。
