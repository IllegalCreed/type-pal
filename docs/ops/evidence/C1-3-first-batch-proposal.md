# C1-3 第一批 NPC 归档决策（用户已批准）

日期：2026-08-14
状态：**用户已批准 exact decision content digest**；机器可执行 authority 由
`packages/migrate/src/pal-c1-npc-first-batch.ts` 重新核对 source/canonical evidence 后生成。

## 冻结输入

- Candidate report：`c2bb3bdce36e973ee7d631344afab00e9a114d82fe2a03eecda1cf5091e97e82`
- Cue coverage：`5dcbe205d0ac1b922433c163ca0a6f26d164159cd6be9083a677e6d07ed20491`
- Source evidence：`c479628b3b9cea83c8397749be60337736ebc4372d41620f992b97a16baefaf6`
- 来源闭包：43,503 条原始指令；13,513 条唯一 `showDialog`；4,316 个候选 cue / 8,817 行全部回接。
- 当前 decision draft content digest：
  `3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f`
- 闭包：8,011 个候选 = 169 accepted proposal + 7,842 deferred + 0 rejected。

以上 digest 任一变化，本提案自动失效。用户批准对象只能是最后一项 **decision draft content digest**，
不能用人物名、speaker 或 portrait 通配表达批准。

## 建议人物

| Actor id | 显示名 | 默认大世界精灵 | 默认立绘 | 实体 | 对话 |
|---|---|---|---|---:|---:|
| `li-daniang` | 李大娘 | `sprite-21` | `portrait.pal.055` | 3 | 81 |
| `jiu-jianxian` | 酒剑仙 | `sprite-16` | `portrait.pal.037` | 3 | 82 |

两者都不推断 battler、face、装备、行为、pages 或敌对职责。Actor 只共享姓名、默认精灵和立绘资源；
场景位置、脚本、行为和生命周期继续保留在 scene entity。

### Entity 精确清单

| Actor | source identity | canonical locator | parent entity sha256 | candidate id |
|---|---|---|---|---|
| 李大娘 | `s001/e19` | `content/scenes/s001.json#/entities/19` | `4a4d4ddac16e18262ccbbb9c12774f2d70142ea6657542ee496edb66e1810fb8` | `78dbbfc589553ee97a2140fe2dbedb8b8467a6ed18f7e8657357f9db0a7cf579` |
| 李大娘 | `s002/e38` | `content/scenes/s002.json#/entities/6` | `03b1abdec21daddd74eb0089685bbf095d661a35e3b8af52f2b226a5d5634182` | `fd1c776a1bba2004313a593b5eb1967a7147be5d1a3c99797d558a29eb6ee961` |
| 李大娘 | `s003/e56` | `content/scenes/s003.json#/entities/12` | `34e1831f63a620ded96dc9f5159c5210b554d1f40c41a7dde4aee8947716900e` | `0ddd149f970cca57281298de1528f2089e85c3287717eade801b5d809a18780e` |
| 酒剑仙 | `s155/e2518` | `content/scenes/s155.json#/entities/1` | `68952b3010085b0ddd3891a86b030728901a85799343f4b889e0cbf608f5db4f` | `18cb17517cd2de4f0a2d8e39e6f237c8ed1dc7b6e0976f2d7f91432df4258b59` |
| 酒剑仙 | `s158/e2648` | `content/scenes/s158.json#/entities/4` | `d0bb04f895e87bf15dd17e130850e90d9108449cf95a057f9d155aefb2b5c59c` | `30c5a7f409c7d5a54c02a26731516710181d2a13e7ed5524d679f1be66a4ff7a` |
| 酒剑仙 | `s159/e2651` | `content/scenes/s159.json#/entities/1` | `d40bb6a9fa02c9bb24a1483a3229e96094db10a5109b8ca0619839063a50e437` | `819605aaf2255e736580dcf9c26eeaf34210e92e821fc2c56377da00186fbe2c` |

这些实例的当前 sprite 与建议 Actor 默认 sprite 精确相等；投影只把实体判别字段 `sprite` 换成
`actor`，其余实体字段和行为不变。脚本宿主仅作上下文证据，不单独证明身份，最终仍需用户批准。

### Dialogue 精确集合

| Actor | 原显示身份 | 立绘/侧边 | cue 数 | candidate group | group members digest |
|---|---|---|---:|---|---|
| 李大娘 | 李大娘 | `portrait.pal.055@left` | 35 | `candidate-group-15bdd508f8278b2b973f7c7f2f0cf2eb43ab2fb3c1e0d6e3e078db884145fdd4` | `cd1e69d8cc5cf4d20a34b3634ac24555e37c73a4331a07f2f385568a9155033b` |
| 李大娘 | 李大娘 | `portrait.pal.055@right` | 40 | `candidate-group-199620b7f20f39da6825751500d90ba2d67059eb174f5473a8ea4e8d0d49dd80` | `50fa305c5ebe91917c6d1f56dbd012fb85417898294a2b8e603ff55af987e934` |
| 李大娘 | 李大娘 | 无立绘 | 6 | `candidate-group-30f2473453ed59eac8f2a11aab920460236afffd70ff42f60eb5b00ae36d2e2b` | `96c677b7413a9ee7315d23316c1871f88e05a21e7a6beb08b2bd0b6ad7d161c8` |
| 酒剑仙 | 酒剑仙 | `portrait.pal.037@left` | 32 | `candidate-group-4e33b4d53d95fbefbdd1a51304a0b8299bc659815128c3abb93e27bd36d3c449` | `635c2411f13e53e1d927a8791afe2f8b3b9507be4c339cfeb946eec7ec0336a8` |
| 酒剑仙 | 酒剑仙 | `portrait.pal.037@right` | 25 | `candidate-group-bf23e53ca89243cd3bc802803ce9778d5c701fbdcbf149a5e1301212f048a575` | `0dbfd3e82de2554ffd2ece5ede68b4773b525f3a57287072e304c14b747aff41` |
| 酒剑仙 | 酒剑仙 | 无立绘 | 12 | `candidate-group-f98b47f9bfb6557ea533fdcc05a57f6ef523e496a327fbdcc29df37c7b2f548e` | `63f31c334e07f00557b5336338c5d1ef326f15be466562b5e2577246d1ed16c1` |
| 酒剑仙 | 醉道士（alias） | `portrait.pal.037@left` | 12 | `candidate-group-97bd6524a75bf1b88dc46204bc36e3751d4c8c7bf67cccb7a104fe61a0022614` | `11f1c835a872044681c94bfdefe4250c18eb322895d8fbb38d1dadff483fd26c` |
| 酒剑仙 | 酒剑仙苦笑曰（alias） | `portrait.pal.037@right` | 1 | `candidate-group-51edcb0a41c02f48c3d0fef95b4c55fad30e8bdfa7708921279fae4324d3a365` | `679ec44b1283ebd6e0fd00679d9d68c51da8354c40a001e8ef4aca510f0b1f42` |

每个 group 在 decision draft 中已经展开成逐 cue candidate id、完整 parent cue hash、identity pointer/hash，
以及逐行 `TextId + locale text hash + source address + source command hash`。别名使用
`speakerOverride`，因此投影前后显示名、立绘 asset 和 side 完全相等。

## 明确 deferred

- 仅有 `portrait.pal.055`、没有 speaker 的 1 条 cue：不能改成 Actor，否则会凭空显示“李大娘”。
- 仅有 `portrait.pal.037`、没有 speaker 的 2 条 cue：同理不能改成 Actor。
- 其余 7,839 个未选候选全部保持原样；第一批不靠 sprite/speaker/portrait/hash 自动扩张。

## 用户批准语句

确认上述 Actor id、姓名、默认 sprite、默认 portrait、6 个实体、163 个 cue（含“醉道士”和
“酒剑仙苦笑曰”别名）以及 deferred 边界后，请批准：

```text
C1-3 第一批 decision digest：3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f 通过
```

用户已于 2026-08-14 原文批准上述 digest。projector 仍须通过 same-version seal/rewind/事务门禁与三方
review；批准不等于跳过工程验收，也不授权任何其他 candidate。
