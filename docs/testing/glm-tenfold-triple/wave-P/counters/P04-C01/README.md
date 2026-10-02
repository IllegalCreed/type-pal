# P04-C01 退役档（r17）

变异轴：`actor-references.ts:48` 空 actorId 守卫（`|| actorId.length === 0` 移除）。
业务针：P04-G01-2「空串 actor id 不产出任何引用边」（已随 r17 返工撤回）。

退役理由（codex-opq-r17-review-20261002 P-R17-02）：空 id 例同时传场景空 actor 与入口
`party=['','hero']`——公开 `validateStartWorld:95-107` 直接拒收空 party id（期望非空角色 id），
`add()` 是内部 helper，`collectActorReferences` 并非 unknown 输入校验入口；当前 fixture 未证明
合法 producer，业务信用不接收。未发现当前公开合法临时输入生产链，按原卡停/退该轴。

三份 raw（positive/mutated/restored）与 receipt 对象原字节保留；四份 JSON 对象值与 2cd548a8 完全相同、字节因 r17 按 P-R17-01 统一 biome format 而变（原字节在 2cd548a8 Git）。不计活跃、不补旧目标新针、不重新执行不存在目标、不恢复坏格式。
