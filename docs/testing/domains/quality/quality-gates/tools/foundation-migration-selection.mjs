/** Historical diagnostic selection after the merge specs were reorganized by responsibility.
 * Official test/coverage selection is unchanged. Names preserve the old 11-case cohort;
 * this mapping does not give the old source mutants or old coverage results current credit.
 */
export const mergeTestFiles = [
  'src/migration-merge.json.test.ts',
  'src/migration-merge.arrays.test.ts',
  'src/migration-merge.content-records.test.ts',
]
const boundaryNames = [
  'mergeManagedFile · 原子三方真值 三侧同值时保留完整结果且没有冲突',
  'mergeManagedFile · 原子三方真值 上游未改时保留作者的完整修改',
  'mergeManagedFile · 原子三方真值 两侧同改同值时无冲突',
  'mergeManagedFile · 原子三方真值 作者删除而上游未改时结果缺席',
  'mergeManagedFile · 原子三方真值 作者删除而上游修改时保留缺席并报告完整根冲突',
  'mergeManagedFile · 原子三方真值 根缺席时双侧不同新增保持整项 add-add 冲突',
  'mergeManagedFile · 原子三方真值 仅作者新增文件时保留作者完整正文',
  'mergeManagedFile · 普通数组 普通文件的无 id 数组保持原子更新，不套身份规则',
  'mergeManagedFile · poisons 路径的身份分派 根缺席仍按 id 合并共同新增与双方独有项',
  'mergeManagedFile · poisons 路径的身份分派 同 id 双改只冲突该字段，未改项完整保留',
  'mergeManagedFile · poisons 路径的身份分派 根缺席仍拒绝重复 id，并保留作者输入与三侧诊断',
]
const otherNames = [
  'mergeManagedFile · 场景及 skills 身份分派 entities 双方独有项合并，完整正文与三个输入都保持正确',
  'mergeManagedFile · 场景及 skills 身份分派 entities 同 id 双方新增不同正文时保留作者并给出完整 add-add',
  'mergeManagedFile · 场景及 skills 身份分派 entities 拒绝非对象身份，诊断和 fallback 不丢输入',
  'mergeManagedFile · 场景及 skills 身份分派 entities 单侧重复 id 不被未改上游豁免',
  'mergeManagedFile · 场景及 skills 身份分派 scene index 单侧尾增与对侧修改原记录可以共存',
  'mergeManagedFile · 场景及 skills 身份分派 已有场景根缺 entities 键时仍按条目身份合并双方新增',
  'mergeManagedFile · 场景及 skills 身份分派 整个场景文件缺席时双方不同新增产生根 add-add，不能只拼 entities',
  'mergeManagedFile · 场景及 skills 身份分派 skills 集合合并双方新增，同时保留集合外的 levelUp',
  'mergeManagedFile · 无 id 页的位置路径（低层 characterization） 两侧相同尾增保留完整页，而非只检查长度',
  'mergeManagedFile · 无 id 页的位置路径（低层 characterization） 等长页内独立修改保持其它页',
  'mergeManagedFile · 无 id 页的位置路径（低层 characterization） 同页同叶双改定位到该槽位字段，保留作者值',
  'mergeManagedFile · 内容记录所有权 双方首次增加同 id 模板时，作者接管优先于 add-add',
  'mergeManagedFile · 内容记录所有权 真实精灵根数组中删动作并修改另一动作，保留完整剩余时间线',
  'mergeManagedFile · 内容记录所有权 双方首次增加同 AssetId 时，authored 整条优先于 generated',
  'mergeManagedFile · 内容记录所有权 catalog 删除版本字段后必须由真实目标校验器拒绝',
  'mergeManagedFile · 输入与结果所有权 嵌套冲突快照与结果脱离三侧输入，也不互相别名',
  'mergeManagedFile · 相等子树的身份校验 三方相同的重复 SceneId 仍拒绝，不能因整树相等跳过身份校验',
  'mergeManagedFile · JSON Pointer 与普通字段 JSON Pointer 为冲突键分别转义斜杠和波浪号',
  'mergeManagedFile · JSON Pointer 与普通字段 普通对象删键对修改仍精确报告缺席，不影响其它字段',
  'mergeManagedFile · JSON Pointer 与普通字段 作者未改 sidecar 时采纳迁移侧完整正文',
  'mergeManagedFile · 身份集合路径 actors 根集合按 id 合并，不退回整数组',
  'mergeManagedFile · 身份集合路径 enemy-teams 同 id 双新增时保留作者整项并报告三侧',
  'mergeManagedFile · 身份集合路径 嵌套 pages 按稳定身份合并双方新增，并保留 initialPage',
  'mergeManagedFile · 身份集合路径 嵌套行为 flow 的 stages 按稳定身份合并双方新增',
  'mergeManagedFile · 删除与稳定身份顺序 迁移删除连续中段时，保留作者修改并依原位置插回',
  'mergeManagedFile · 删除与稳定身份顺序 两个修改项被迁移删除后，仍保留作者交换后的相对顺序',
  'mergeManagedFile · 删除与稳定身份顺序 双方同删的记录不再进入身份数组结果',
  'mergeManagedFile · 删除与稳定身份顺序 合法 PageId 页的交错删除保留作者修改，输出没有空位',
  'mergeManagedFile · 缺键数组原子规则 普通 JSON 缺集合键时，双侧有序数组新增整项 add-add',
  'mergeManagedFile · 缺集合键的分派 场景索引缺集合键时仍按身份合并新增，迁移侧顺序在前',
  'mergeManagedFile · 缺集合键的分派 实体缺 pages 键时，双方有 PageId 的新增页按身份并存',
  'mergeManagedFile · 无 id 位置路径（非 current 场景） 两侧不同长度的尾删只保留共同前缀',
  'mergeManagedFile · 无 id 位置路径（非 current 场景） 缺 pages 键且双方页无身份时保持整数组 add-add',
]
const excludeNames = (names) =>
  `^(?!(?:${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$)`
export const withoutMergeBoundaryCases = excludeNames(boundaryNames)
export const onlyLegacyMergeBoundaryCases = excludeNames(otherNames)

// Preserve the original merge/plan/baseline cohort after responsibility-based relocation.
export const foundationTestFiles = [
  'src/migration-merge.json.test.ts',
  'src/migration-merge.arrays.test.ts',
  'src/migration-merge.content-records.test.ts',
  'src/migration-baseline.snapshot.test.ts',
  'src/migration-plan.maps.test.ts',
  'src/migration-plan.files.test.ts',
]
const foundationNames = [
  'mergeManagedFile · 原子三方真值 三侧同值时保留完整结果且没有冲突',
  'mergeManagedFile · 原子三方真值 上游未改时保留作者的完整修改',
  'mergeManagedFile · 原子三方真值 两侧同改同值时无冲突',
  'mergeManagedFile · 原子三方真值 作者删除而上游未改时结果缺席',
  'mergeManagedFile · 原子三方真值 作者删除而上游修改时保留缺席并报告完整根冲突',
  'mergeManagedFile · 原子三方真值 根缺席时双侧不同新增保持整项 add-add 冲突',
  'mergeManagedFile · 原子三方真值 仅作者新增文件时保留作者完整正文',
  'mergeManagedFile · 普通数组 普通文件的无 id 数组保持原子更新，不套身份规则',
  'mergeManagedFile · poisons 路径的身份分派 根缺席仍按 id 合并共同新增与双方独有项',
  'mergeManagedFile · poisons 路径的身份分派 同 id 双改只冲突该字段，未改项完整保留',
  'mergeManagedFile · poisons 路径的身份分派 根缺席仍拒绝重复 id，并保留作者输入与三侧诊断',
  'baseline snapshot encoding 只认 content/maps/ 下非 index 的 .json',
  'baseline snapshot encoding 默认形状：JSON.stringify(value, null, 2) + 换行（精确字节）',
  'baseline snapshot encoding 原子地图路径走 formatProjectMap：合法 v4 图字节稳定；非 v4 版本拒绝',
  'baseline snapshot encoding 已知输入的精确摘要（字符串与 Uint8Array 同摘要）',
  'baseline snapshot encoding 显式 null：present=true，hash=序列化字节摘要；write-map 含 null 正文',
  'baseline snapshot encoding 真正缺席（managed 却无 files/hashes）：present=false，baseline 生成门拒绝',
  'baseline snapshot encoding metadata/write-map 对应：_state.json 记录的 hash = write-map 正文字节摘要',
  'canonical map bytes and absence ours=base + theirs 改 → 生成 theirs 值的 write；hash 按序列化字节比较',
  'canonical map bytes and absence ours 与 theirs 同改同值 → 无 write（字节相同视为同一版本）',
  'canonical map bytes and absence theirs 删除未改的原子地图时，计划删除工程中的该图',
  'canonical map bytes and absence ours 侧已缺席的原子地图无需再次删除',
  'canonical map bytes and absence 原子地图的图层名称变化产生携带完整正文的 write',
  'canonical map bytes and absence 仅未建模扩展字段不同的地图按 canonical 字节视为同版本',
  'file classification and global stop 上游更新与退役：精确 target/writes/deletes/summary',
  'file classification and global stop 未托管的工程文件不进入 target/writes/deletes',
  'file classification and global stop 冲突时：全部文件的 writes/deletes 清空（含无关净改文件与待删除文件），target 仍含作者侧值',
  'file classification and global stop 同输入重复调用稳定且三侧输入深快照（files 值/managedFiles/hashes）均不被修改',
]
export const withoutFoundationBoundaryCases = excludeNames(foundationNames)
export const onlyFoundationBoundaryCases = `^(?:${foundationNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`
