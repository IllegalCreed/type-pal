# RLE 三文件文案整改 r1（copy-fix-r1）

Status: done（有限文案/标题与C1–C3获接收；三文件治理仍review）
Owner: GLM（Coding Owner，按[校准包准入](../calibration-20261018/README.md)第 5 节与[长期规范 4.1](../../../../code-quality.md)直接执行）
Date: 2026-10-18
基点：`d3f59cadd3389693e600f06a43d32ccebff68f6c`（origin/codex/code-quality-3y，fetch 复核后锁定）
交付形态：唯一临时 detached worktree `~/.glm-worktrees/pre94-rle-copy-r1`（HEAD 游离于基点之上，本目录两笔提交：①三文件文案整改 ②本证据包）。未创建/推送任何分支；主树与集成树只读未动。

## 裁定页（短回执）

- **白名单**：`packages/shared/src/rle.ts`、`rle.test.ts`、`rle.boundaries.test.ts`，仅注释/docblock/错误测试标题；未改实现、参数、出口、fixture 字节、断言、测试增删、G-1 防御分支、格式算法。
- **实际增改**：9 处，全部为注释或标题（明细见下）。rle.test.ts 的 26 例正文与断言零变化（仅 1 标题更正）。
- **结果**：定向 4 文件整改前后均 51/51（0 fail/skip/pending/todo）；51 身份 = 47 不变 + 4 标题更正（一一映射见 [identity-mapping.json](identity-mapping.json)）；三文件"去注释打印 AST"字节级一致（rle.ts 全文未掩码；两测试文件标题字面量双侧掩码后一致，见 [body-invariance.json](body-invariance.json) 与可重跑脚本 [prove-body-invariance.mjs](prove-body-invariance.mjs)）。
- **门**：scoped biome（3 白名单文件 + 本证据目录 8 文件）0 error/0 warning/0 info；shared `tsc --noEmit` exit 0；`git diff --check` 干净；check:docs 见 [gates.json](gates.json)。按准入未跑全仓 check / official ratchet / protected fast / E2E / 视觉（纯文案批，无视觉校验点）。
- **请求裁定**：接收本两笔提交并在 3y 分支集成；R-1/R-2 标识映射与 B/G 补证见下；G-1/O-1..O-4 维持登记不动。

## 增改明细（9 处）

| # | 文件:位置 | 类型 | 内容 |
|---|---|---|---|
| 1 | rle.ts 模块头 | 注释 | `0x02000000` 前缀记法改为字节序列 `02 00 00 00`（u32 LE `0x00000002`）并指向 skipFilePrefix 段 |
| 2 | rle.ts `decodeStrictSpriteFrame` docblock | docblock 重排 | 原"精灵 chunk 解析"容器 docblock 错挂在本函数，替换为本函数真实合同（[offset,end) 边界、尺寸 1..SPRITE_DIM_MAX、零长指令拒绝） |
| 3 | rle.ts `parseSpriteChunk` 新 docblock | 注释（含更正） | 容器格式/sanity guard/键一致性铁律迁回本函数；更正三处：①"decodeRle 死循环"过时表述→现行有界失败（病态尺寸仍先尝试超大分配）②"原版引擎从不显式索引尾帧"无证据断言→改为 sdlpal 按帧号取帧、越界返回 NULL 的已核事实并标注原版侧未核证③键一致性明确"过滤后序列下标，非原 slot 号" |
| 4 | rle.test.ts 空帧用例标题 | 标题 | `返回数组下标 = tile 索引` → `返回数组下标 = 过滤后序列的 tile 索引,非原 slot 号` |
| 5 | rle.boundaries.test.ts 文件头 | 注释 | "既有 rle.test 已覆盖…不重复" blanket 声明改为承认跨文件相邻重叠、排重映射另核（对应 O-4） |
| 6 | boundaries 两帧混合游程标题 | 标题 | 删除未测的"无 sentinel 报告"宣称（该例未调 report 入口），改为"（无 sentinel 容器构造）"描述构造事实 |
| 7 | boundaries 零长度相邻正控标题 | 标题 | "合法 1 长度" → "合法 2 长度 literal"（good fixture 实为 0x02 run） |
| 8 | boundaries 四轴标题 + 第 4 断言行内注释 | 标题+注释 | "帧头越界" → "尺寸非法"；行内注明 w=h=0 走尺寸轴、header 边界轴由相邻 offset 例覆盖 |
| 9 | boundaries 坏尾注释 | 注释 | `width=0xFFFF` → `width/height=0x0FFF(4095) 超 SPRITE_DIM_MAX` |

## B/G 补证（对首批报告的更正）

- **B 维漏项（Codex 校准指出，本批全部修复）**：长度 1/2 标题（#7）、过时死循环（#3）、docblock 附错函数（#2）、索引合同表述（#3/#4）、boundaries 首例未调 report 入口的宣称（#6）、头部"不重复"排重宣称（#5）。
- **G 维漏项（登记，不修）**：`parseSpriteChunkStrict` 两臂（sentinel 裁剪后 `frameCount<=0`；`offsets[0]!==tableBytes`）在 slot0=count 双身份下可证不可达——维持 G-1 结构候选，本批未触碰（与文案分批，按准入）。
- **R-1/R-2 标识映射（补全转交摘要缺失的定义）**：R-1 = 首批报告"O-2/R-1 parseSpriteChunk 缺 <2 字节过短守卫、错误合同与 strict/indexed 不齐"→ 已归父卡错误合同候选（校准包 O-2 行）；R-2 = 首批报告"sentinel/坏尾轴跨 rle.test/boundaries/glm-o 轻度重复的少而精精简候选"→ 已归 O-4 测试合同映射候选。两标识不新增准入请求。

## 执行事实

| 项 | 值 |
|---|---|
| 基线定向（整改前） | `vitest run --reporter=default --reporter=json --outputFile=base-targeted.json`（cwd=packages/shared，2026-10-18 17:03）4 文件 51/51，exit 0，输出无诊断；[base-targeted.json](base-targeted.json) |
| 整改后定向 | 同命令 → `after-targeted.json`（17:19）51/51，exit 0，无诊断；[after-targeted.json](after-targeted.json) |
| body 不变性 | `node docs/.../prove-body-invariance.mjs` exit 0：rle.ts 323 令牌对 325 为弃用的 scanner 法（模板串+注释反引号误词法，已改弃）；采用 parse+print(removeComments) 法三文件 printedEqual=true（[body-invariance.json](body-invariance.json)，typescript 版本内嵌） |
| 身份映射 | python 对比 base/after run JSON：51=47 不变+4 变（boundaries 3 + rle.test 1），逐条见 [identity-mapping.json](identity-mapping.json) |
| scoped biome | `biome check <3 白名单文件> <本目录>`：Checked 8 files，0 error/0 warning/0 info（脚本曾报 3 useTemplate info + 1 organizeImports error，修复并重跑后归零；原件过程未存中间红态，终态可复跑） |
| typecheck | `tsc --noEmit -p packages/shared/tsconfig.json` exit 0 |
| diff --check | exit 0（无空白错误） |
| check:docs | 见 [gates.json](gates.json) |
| 基点输入 SHA | rle.ts/rle.test.ts/rle.boundaries.test.ts @ d3f59cadd 与校准包 manifest 同源（fetch 后锁定） |

## 过程披露：vitest list 位置参数写入源文件事故

采集身份时 `vitest list --json src/rle.test.ts src/...`（vitest 4.1.7）把全包列表 JSON **写入第一个位置参数** `src/rle.test.ts`（位置参数被当作输出目标，非过滤器；/tmp 探针复现证实，22808B）。当即发现：`git diff --stat` 异常 → `git checkout -- src/rle.test.ts` 恢复为基点字节 → 重做本文件唯一一处标题整改。基线 51/51 证据采集于事故前，不受影响；恢复后该文件相对基点仅含 #4 一处标题更正（body-invariance 证明覆盖）。身份采集改用 run JSON 的 assertionResults（与校准包同法）。教训已登记，`vitest list` 不再带仓库内位置参数使用。

## 复验入口（Codex 快检，只读）

```bash
WT=~/.glm-worktrees/pre94-rle-copy-r1
git -C "$WT" log --oneline d3f59cadd..HEAD            # 预期两笔：文案整改 + 证据包
git -C "$WT" diff d3f59cadd..HEAD -- packages/shared/src  # 预期仅注释/标题差异
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/copy-fix-r1/prove-body-invariance.mjs"  # exit 0, allEqual true
cd "$WT/packages/shared" && ../../node_modules/.bin/vitest run \
  src/rle.test.ts src/rle.boundaries.test.ts src/rle.glm-o.test.ts src/rle.glm-runtime-resource.test.ts  # 51/51
"$WT/node_modules/.bin/biome" check "$WT/packages/shared/src/rle.ts" "$WT/packages/shared/src/rle.test.ts" \
  "$WT/packages/shared/src/rle.boundaries.test.ts" "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/copy-fix-r1/"  # 0 诊断
```

注意：worktree 的 node_modules 为指向主树的软链（未提交）；vitest list 勿带仓库内位置参数（见上节）。语义判断（注释是否更准确、标题是否与真实轴一致）不能自动验证，依赖本 README 明细 + diff 阅读裁定。

## 失效条件

- 基点 d3f59cadd 之后 3y 分支对这三文件或校准包准入范围有新提交 → 本候选需 rebase 重证。
- rle.ts/两测试文件的实现、fixture、断言或第 5 个标题发生变化 → body-invariance/身份映射失效重出。
- vitest/biome/typescript 版本变化 → 证明重跑（方法记录于脚本头注释）。
- 校准包准入被撤回 → 本批整改随之停线，由 Codex 裁定回退或保留。


## r1 窄返工（C1–C3，2026-10-18 第二轮）

按 Codex 验收记录（3y 分支提交 b614e88a9 的 `rle/copy-fix-r1-codex-review.json`；该件在集成分支，不在本候选线，故不作文内链接）执行三项窄返工；复用已接收的 51/51 原生结果与身份映射，未重跑 51 测试与 125 文档工具测试。上文各节为 r1 原文保留；本节为当前有效表述，冲突处以本节为准。

| 项 | 处置 | 证据 |
|---|---|---|
| C1 注释真实性 | rle.ts `parseSpriteChunk` docblock 删除"引擎不触达该尾帧"无证据推断，改为三段事实：`PAL_SpriteGetFrame` 只拒绝 [0,imagecount) 之外的帧号（坏尾槽仍可能在范围内）；坏尾槽是否被真实 caller 请求过未核证；width/height > 400 过滤是当前 TS 实现的容错策略，不是原版行为考据 | 返工提交 diff；只读证明复跑 allEqual=true（C1 为注释级变化，body 不变） |
| C2 快检默认只读 | prove-body-invariance.mjs 重写：默认仅向 stdout 打印报告 JSON 并按 allEqual 退出（0/1），零写入；报告生成改为显式 `--out <新路径>` 且拒绝指向冻结 body-invariance.json（exit 2） | [c2-readonly-run.raw](c2-readonly-run.raw)：运行前后工作树 porcelain 状态与冻结件 sha256（`9fefa373…`，与 Codex 记录一致）不变，run exit 0 |
| C3 原件与声明一致 | 补入真实首轮 docs 原件 [docs-first.raw.gz](docs-first.raw.gz)（/tmp 留存 stdout gzip 而来，含 3 issues FAIL 全文，非补造）；核验 [docs-final.raw.gz](docs-final.raw.gz) 解压 sha256 `ffcb0153…` 与留存 /tmp 原件逐字节一致；登记未保存项并分层事实权（下表）；修正"完整原件齐"类表述 | 本节 + [gates-r2.json](gates-r2.json) 及各 r2 raw |

### 原件清单（事实权分层）

| 证据 | 性质 | 状态 |
|---|---|---|
| base-targeted.json / after-targeted.json | 原生 JSON（51 passed / 0 failed·pending·todo、状态、身份） | 已存；不证明 console 无诊断 |
| identity-mapping.json | 由两份原生 JSON 派生（Codex 已独立复算一致） | 已存 |
| body-invariance.json | r1 冻结件（sha256 `9fefa373…`） | 已存，冻结永不覆盖 |
| docs-first.raw.gz / docs-final.raw.gz | 原生 docs 全输出（首轮 FAIL 3 issues / 复跑 PASS 0 issues） | 均已存；final 与 /tmp 留存 sha 一致 |
| c2-readonly-run.raw / biome-r2.raw / docs-r2.raw / diff-check-r2（见 gates-r2.json） | 本轮新执行原件 | 已存 |
| vitest base/after console（default reporter stdout） | 作者自报摘要（"4 files 51 passed"等） | **未保存**；计数/状态由原生 JSON 证明，console 无诊断为作者自报 |
| r1 首轮 scoped biome / typecheck / diff-check stdout | 作者自报终态（零诊断、exit 0） | **未保存**；r2 起同类门 stdout 全量落盘（biome-r2.raw 等） |

### 更新后的复验入口

原"复验入口"命令块继续有效；补充：prove-body-invariance.mjs 现默认只读（stdout 报告 + 退出码，不改工作树，见 C2），`--out` 仅用于显式另存新报告。语义判断（注释表述是否如实、标题是否与真实轴一致）仍需人工读 diff 裁定。


## Codex终验与集成（2026-10-18）

C1–C3按证据验收接收：三文件正文保持，4标题映射沿已核51原生结果；默认快检实际只读，首轮docs原件已补，未保存历史输出明确作者自报。Codex仅对增量/证明产生者/原件作定向核验，未重跑51/125或全仓/覆盖率门。四候选提交已按序拣选至3y；原source→集成映射、输出保护及原件SHA见[终验记录](../copy-fix-r1-codex-final.json)。

集成另补一行`flag: 'wx'`，使可选`--out`真正只创建新文件：新文件正控、已有文件/链接拒绝、冻结路径拒绝及默认只读均验证；冻结报告字节不变。此为证据工具的文件保护，不是产品行为修复。旧r1/返工原件保持，G-1/O-1/O-2/O-4/格式真值卡继续pending/review/draft，0代码文件关闭。旧复验块的“预期两笔”为r1历史，当前内容以终验与实际Git映射为准；接收后临时worktree清理，后续可在集成仓库运行只读证明。

集成仓库的只读快检命令：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/copy-fix-r1/prove-body-invariance.mjs`，预期exit0且allEqual=true；不要求重跑51测试。
