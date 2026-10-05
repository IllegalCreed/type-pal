# TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 排重账

7 文件逐轴 `source:line × public caller × input × oracle × fullName` 判定。基线：`origin/main` `cb12a63e2`，
unit 定向 v8 覆盖（migration-plan 100%/97.91B、transaction 99.52/99.45B、write-plan 100/95B、
project-io 97.36/93.47B、current-publication 98.07/92.5B、store-boundary 100/95.87B、files 类型模块）。
既有 fullName 域：migration-plan(.test/.boundaries/.glm-o)、migration-transaction(.test/.boundaries/.glm-o/.kimi-r1)、
migration-write-plan(.test/.boundaries/.glm-o/.glm-next-wave)、migration-project-io 四套件、
pal-current-publication(.pal/.glm-o/.glm-next-wave)、pal-store-boundary 三套件、
Kimi extract/migrate（coverage85-kimi-extract-migrate-r1）、GLM-O migration（O01/O02/O03）、
asset-supply 归档卡（TEST-GLM-MIGRATE-ASSET-SUPPLY-1 ledger）。v8 locless/纯类型行不作 unreachable 依据（判例沿用）。

## 1. migration-plan.ts（218 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :30-43 snapshotOf | existing-proof | glm-o `snapshotOf 为每个文件产出序列化 hash 且原子地图走专用格式化` |
| :45-53 canonicalSnapshot | non-contract | 内部规范化（可选 hashes 透传），随全部 createMigrationPlan 合同覆盖，无独立公开 oracle |
| :55-71 AtomicFileState/sameAtomic | existing-proof | 原子地图三方合同族（test:435-477 + glm-o O02） |
| :73-77 hashVersion | mixed | present-false 臂 existing-proof（冲突快照 `present:false`）；**:75 `?? 'missing'` 臂 unreachable（typed-input）**——snapshotFileHash 对 files 命中必返回计算 hash，hashes 为 `Map<string,string>` 无 undefined 值，合法类型输入不可构造 present=true 且 hash undefined（需强转） |
| :79-132 mergeAtomicMapFile | existing-proof | glm-o 双侧 hash-only 回填/缺正文 fail-loud/value 冲突 hash 版快照/delete-modify/add-add；**:103 第一处 'add-add' 逻辑 unreachable**——冲突需 `!oursSameBase && !theirsSameBase && !sameAtomic(o,t)`；`!b.present` 时 sameAtomic(x,b) 即 `!x.present`，两侧均须 present 才能同时偏离 base，与首分支 `!o.present || !t.present` 矛盾（双方异增走 :105 'add-add'，glm-o 已证） |
| :134-217 createMigrationPlan | existing-proof | test 16 + boundaries 8 + glm-o 12 合同（分类/summary/重放零计划/冲突零写盘/托管并集/输入不可变）；冲突时 `!conflicts.length` 才产出 writes/deletes 且 deletes 只含 ours 在场托管文件（boundaries:74-98 更严版本） |

## 2. migration-transaction.ts（374 行）

既有四套件（test 8 / boundaries 2 / glm-o 20 / kimi-r1 6）已覆盖：safeRel/strictRepoRel 路径域、scope 目标域、
symlink、journal version/id/kind/hash/staged/preconditions 全单轴、TOCTOU 提交窗口、规划快照 hash、中断补完、
幂等恢复、manifest-last/闭包/并发窗口、cleanup 与 pending 互斥、事务 id 复算。

| source:line | 判定 | 依据 |
|---|---|---|
| :105-167 validateJournal | existing-proof | boundaries 单轴表（两操作真实中断 + 拒绝后逐字节保留）+ kimi-r1 残余 + glm-o 恢复拒绝 |
| :193-206 validateManifestOrdering | mixed | 非最后/删除/伪装 scope/缺前置四臂 existing-proof（test:192-229 + glm-o）；**:198 `manifests.length > 1` 提交预检臂净新 ×1（本卡 TX-DUAL-MANIFEST 针）** |
| :208-229 窗口守卫 | existing-proof | assertPreviousTarget（test:231-261 并发窗口 + glm-o baseline 窗口）、assertPlannedTarget（test:24-48 退役规划 hash）、assertPreconditions（test:146-190 + glm-o 闭包失败恢复） |
| :231-256 applyJournal | existing-proof | 恢复补完（test:72-105）、幂等跳过（glm-o hash 一致）、提交后哈希复核（glm-o）、恢复缺 staging（boundaries） |
| :258-275 cleanup/recover/hasPending | existing-proof | journal 清理/二次 false（boundaries:86-101）、cleanup 跳过 unlink（kimi-r1）、pending 互斥（glm-o） |
| :277-373 commitMigrationTransaction | existing-proof | glm-o 提交侧单轴 + kimi 残余 + test 主干；:322-332 id 推导 glm-o 同集合同 id/异内容异 id |

**账目修正**：migration-transaction.kimi-r1.test.ts 头注将 :198 判为 construct-unreachable（「所有调用点都先经
per-op scope 规则与重复目标拒绝」）。该证明仅对恢复路径成立（validateJournal 的 assertScopeTarget 先把
manifest scope 钉死固定目标，且重复目标在 :120 拒绝）；提交路径的预检（:313 validateManifestOrdering）运行在
scope 域校验（:362 validateJournal）与 staging 创建之前，**两个不同目标的 manifest scope 变更**通过重复目标
检查（:296）后合法到达 :198。本卡以 `MP1 迁移事务 manifest 排序门 两个 manifest scope 变更（不同目标）在提交
排序门被拒绝且零写盘` 一手实证并收口（预检拒绝时零控制目录/零目标写入/无 pending）。

## 3. migration-write-plan.ts（110 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :15-18 differs | existing-proof | 相同跳过/漂移重写（test:114-131/:174-196 + boundaries:114-126 正控） |
| :34-41 plannedHash 三守卫 | existing-proof | glm-next-wave J06 四臂（未纳入/缺 hash/携带原始字节 hash/null） |
| :42-46 工程写入排序 | existing-proof | boundaries T03 全序 + test:151-173 场景正文先于 index |
| :47-60 writes/deletes 变更 | existing-proof | glm-o map 专用序列化 + null/规划 hash 两臂 |
| :61-76 退役计划 | mixed | 越界五例（test:74-91）+ 排序/hash（boundaries:75-104）+ 写×退役重复（glm-o）existing-proof；**:62 id tie-break 臂 non-contract**——同 path 双退役随后必被 :78 重复目标守卫拒绝，排序差异不可独立观察 |
| :78-79 重复工程目标 | existing-proof | test:93-101 + glm-o |
| :81-95 baseline 段 | mixed | 内容一致跳过（test:114-131/:174-196）、_state 最后（boundaries:66-70）、previousBaseline 独有删除在场臂（boundaries:127-135）existing-proof；**:91 `existsSync` false 臂净新 ×1（本卡 WP-PHANTOM-BASELINE-DELETE 针）**——退役 baseline 文件不在磁盘时不产生幻影 delete（幻影 delete 会让 commit 对不存在目标 unlinkSync 抛错，把陈旧 baseline 条目放大成整次迁移失败） |
| :96-107 manifest 段 | existing-proof | 缺前置拒绝（test:103-111）、磁盘一致跳过（:114-131）、最后提交（:132-172） |

## 4. migration-project-io.ts（134 行）

| source:line | 判定 | 依据 |
|---|---|---|
| :19-33 scene index 发现 | existing-proof | test:86-102 + boundaries:34-49（正控/坏 JSON/非法 id） |
| :34-43 scripts chunks 发现 | **已签排除** | boundaries T01 注（2026-10 前卡）：chunks 属 E05 历史输出退役域，不为其新增发现/拒绝合同（含 :40 chunk path 无效臂）；current publication 侧 `FORBIDDEN_CURRENT_PATH` 亦禁 `content/scripts/` 前缀。本卡不重开该域 |
| :44-53 maps index 发现 | existing-proof | boundaries:72-79 非数组 + glm-o path 非字符串/合法并入 |
| :57-64 safeProjectPath | existing-proof | boundaries:90-92 `../` 越界 + glm-o 绝对路径 |
| :66-84 loadProjectMigrationSnapshot | existing-proof | test:30-38 + next-wave J04（原始字节 hash/坏 JSON cause/缺失跳过/常量冻结） |
| :86-98 assertProjectSnapshotCurrent | existing-proof | TOCTOU 三臂（test:40-61 + boundaries:93-99）+ glm-o 快照外目标容忍 |
| :100-123 walkFiles/hashUnmanagedProjectFiles | existing-proof | 递归 posix（glm-o）/排除（test:73-84/boundaries:101-111）/目录缺失（glm-o）/identity 旁车（test:104-114） |
| :125-133 assertHashMapsEqual | existing-proof | boundaries 20 路径上限 + glm-o 等值通过/排序消息 |

## 5. migration-files.ts（13 行）

纯类型模块（`MigrationJson`/`MigrationFileSet`），零运行时语句；类型合同由 repo typecheck 承载
→ non-contract（type-only），不设运行时测试。

## 6. pal-current-publication.ts（410 行）

asset-supply 归档卡已对本文件逐轴收口（其 ledger :97-200/:203-399/:402-409 判定沿用）；本卡不重复其合同。

| source:line | 判定 | 依据 |
|---|---|---|
| :97-200 buildPalCurrentPublication | existing-proof | glm-o O01 22 tests + pal.pal.test 4 it（asset-supply ledger 同判） |
| :175 SceneIndex 缺更新目标 | unreachable | asset-supply ledger 判定沿用：updatedScenes ⊆ currentScenes（同 index 派生），公开输入不可构造 |
| :183-186 地图分区数量漂移 | unreachable | asset-supply ledger 判定沿用：tilemaps 1:1 产图，重复 mapNum 在地图审计先拒（glm-o:210-214 证） |
| :203-399 validatePalCurrentPublication | existing-proof | glm-o 16 拒收/放行 + asset-supply PUBLICATION-REFERENCE-GATE 针（:358-365） |
| :402-409 palAssetPreconditions | existing-proof | glm-next-wave J02 4 tests |

## 7. pal-store-boundary.ts（202 行）

asset-supply 归档卡已对本文件收口（STORE0-SOURCE-TIERS/GOURD-POOL-COUNT/VESSEL-CRAFT-COUNT 三针 +
existing-proof 判定沿用）。

| source:line | 判定 | 依据 |
|---|---|---|
| :44-72 assertVesselRecipes | existing-proof-by-family | 消息/配方序/数量漂移已测（test:149-190 + asset-supply VESSEL-CRAFT-COUNT 针）；:46-48/:51 `use?.`/`?? 0` 缺席臂（item268 无 use 字段）为同守卫同 oracle（`craftRecipe=0` 同消息）的输入变体，不堆弱断言 |
| :74-102 assertSpiritGourd | existing-proof-by-family | 奖励档位/消息漂移已测（test:126-163）；:82 `use?.` 缺席臂同理（asset-supply GOURD-POOL-COUNT 针已钉守卫） |
| :104-128 collectOpenShops | existing-proof | boundaries T09 嵌套计数/计数独立 |
| :131-142 assertPalAlchemyBoundaryInvariant | existing-proof | asset-supply 三针直接驱动 + pal.pal.test |
| :145-201 assertPalStoreBoundaryInvariant | existing-proof | test 5 it + boundaries 3 it + pal.pal.test |

## 主题映射（卡面六主题 → 证据锚）

| 主题 | 证据 |
|---|---|
| path/identity/journal/cursor/prefix | 路径域（glm-o safeRel/strictRepoRel/safeProjectPath/symlink）、staging prefix 与事务 id 16-hex（boundaries/glm-o）；本卡补 :198 排序门 |
| partial write/recovery | 中断补完（transaction.test:72-105）、两操作真实中断（boundaries:46-101） |
| foreign conflict/retry | 提交窗口并发修改（transaction.test:231-261）、恢复期窗口篡改（glm-o）、规划快照 TOCTOU（test:24-48） |
| publication atomicity | manifest-last/闭包前置（transaction.test:146-229 + glm-o 闭包失败→修复→恢复同事务） |
| second-run zero diff | 相同状态零变更（write-plan.test:114-131）、退役重放为空（:197-231）、全量 replay（pal-current-publication.pal.test:64/:119、scripts/migrate-content.mts:142 双跑门） |
| cleanup | journal unlink/二次恢复 false（boundaries:86-101）、cleanup 容忍外部删账（kimi-r1）、transactions/<id> 目录清理（glm-o） |

## 针账（2 针，全部定向执行集内唯一红）

| 针 | 合同 | 变异定义点 | 三态 |
|---|---|---|---|
| TX-DUAL-MANIFEST | migration-transaction.ts:198 双 manifest 排序门 | 数量上限 `> 1` → `> 2` 弱化 | 绿→红→绿 |
| WP-PHANTOM-BASELINE-DELETE | migration-write-plan.ts:91 退役 baseline 磁盘真值门 | `existsSync` 前置 `true ||` 弱化 | 绿→红→绿 |

反控回执：[counterproof.json](counterproof.json)（2/2 PASS，含 runner 自测 11 例、TSV identity artifact、
源/变异/恢复 hash、mkdtemp 残留前后扫描）。
