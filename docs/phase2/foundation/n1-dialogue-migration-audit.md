# N1-1 对话控制码退役审计

> 日期:2026-07-15。范围:`projects/pal` 全量迁移产物、baseline、content/reforge/editor 消费链。
> 任务卡:[N1-1-dialogue-control-code-retirement.md](../../ops/tasks/N1-1-dialogue-control-code-retirement.md)。

## 结论

原版对话控制码已收拢到 `packages/migrate/src/legacy-dialog.ts`。生成工程只含
`{kind:'dialog',cue:{rows:[...]}}`;content、Reforge 和编辑器不再解析 `$NN/~NN/-/'/@/"/()/\`。

## 迁移前口径

| 范围 | dialog 命令 | 引用含旧控制码正文的命令 |
|---|---:|---:|
| 脚本 chunks | 6,722 | 1,234 |
| 敌人 choreography | 135 | 12 |
| 合计 | 6,857 | 1,246 |

任务卡原有的“6,722 / 1,234”只统计脚本 chunks。敌人战斗对白使用另一条迁移入口,本次统一接入同一
decoder 后单列并纳入总门禁,避免口径看似不一致。

## 重生成后口径

| 检查项 | 结果 |
|---|---:|
| 扫描 content JSON 文件 | 829 |
| dialog 命令 | 6,858 |
| DialogueRow | 14,200 |
| 非 canonical dialog | 0 |
| 被引用的正文 text id | 8,637 |
| 确定性上下文变体 `.v-<hash>` | 26 |
| 含语义颜色标签的被引用正文 | 125 |

命令数比迁移前多 1,是因为批中 `~NN` 按原版页终语义切成两个 cue,不是重复或膨胀。一个 cue 可含多个
row,所以 14,200 个源行不再被 `join('\n')` 压成单字符串。

## 残留与合法性

对全部 8,637 个 `dlg.*` 值扫描:

| `$NN` | `~NN` | `"` | `-` | `'` | `@` | `()` | `\` | CR/LF | 非平衡颜色标签 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

用户选择 A:原版 18 处 `-` 均按 cyan toggle 解释,负号本身不显示,减益数字写成 `<cyan>…</cyan>`。
`　` 行首缩进在“首个可见正文前设速”的分类中不算语义正文,但字符本身原样保留。

## 开场锚点

`scene/s000/root/on-enter/stage-0` 三段数据为:

1. `dlg.0`:row `speed=112`,center cue `autoAdvance=342`。
2. `dlg.2`:row `speed=16`,speaker 李逍遥,cue `autoAdvance=457`。
3. `dlg.3 + dlg.4`:两 row 均继承并显式展开 `speed=16`,speaker 李逍遥,cue `autoAdvance=685`。

正文不含 `$` 或 `~`;速度、自动推进、说话人、行边界均可在编辑器直接查看和修改。

## 永久门禁

- `legacy-dialog.test.ts`:控制码全集、narration quote、`~` 后死码、转义、光标、`　`、真中途变速
  fail-loud、变体 id 正逆序稳定。
- `translate-events.test.ts`:跨行状态、不同入口态的分支缓存、registry `callScript` 入口/离开态传播。
- `dialogue-project.test.ts`:全 PAL canonical 形态、正文残留、换行、富文本平衡、开场精确数值。
- content validator 默认拒绝 locale CR/LF;loader 只为旧工程结构升级保留软换行读取豁免。
- 全量写盘后第二次迁移:`writes=0 deletes=0 conflicts=0`;脚本体积门禁未放宽。
