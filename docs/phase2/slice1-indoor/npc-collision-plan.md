# 切片 1 补漏:静态 NPC 碰撞(static-npc-collision plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 或 executing-plans 逐 Task 实现。Steps 用 checkbox(`- [ ]`)跟踪。

**Goal:** 切片 1 当前 `collide` 是**死字段**——`EntityDef` 定义了 `collide?: boolean`、鬼填了 `collide: true`,但 reforge 的 `isBlocked`([main.ts:188](../../../packages/reforge/src/main.ts#L188))只判地图 tile、从没读 entity → 玩家能穿过站着的鬼。本计划把静态 NPC 碰撞接上:玩家**不能穿过** `collide:true` 的实体,撞上停下、仍能对话。

**范围(硬边界):** 只做**静态**碰撞(实体位置固定)。NPC 自主移动 + 动态碰撞 + 错位避让 = [design-backlog 议题 15](../design-backlog.md),本计划**绝不碰**(防范围蔓延)。

**Architecture:** `collision.ts` 加纯函数 `sameTile`(复用已有菱形 `pixelToTile`);`main` 的 `isBlocked` 包一层(tile 挡 ‖ 某 `collide` 实体与目标同格)。`movement.resolveMove` **不动**——它的语义本就是「目标被挡即原地停」,isBlocked 注入,撞上即停,天然就是想要的行为。

**Tech Stack:** TS、vitest;reforge 既有约定(`noUncheckedIndexedAccess`、不写 `!`、相对 import 带 `.js`)。

## Global Constraints
- 新引擎零 lint/type:`pnpm --filter @type-pal/reforge run check` + `pnpm exec biome check packages/reforge/src` 各 0/0。
- 碰撞几何是**纯函数**进 `collision.ts`(可单测),不塞 main。
- **不改 `resolveMove` 语义**(撞上停、不滑行——既有红线,见 movement.ts 注释)。
- 静态碰撞用**「同格」判定**:实体占据它 `pos` 所在的站立格,玩家目标落该格 → 挡。

---

## Task 1: collision.ts 加 sameTile(纯函数 + TDD)

**Files:** 改 `collision.ts`、`collision.test.ts`

**Interfaces:** Produces `sameTile(ax, ay, bx, by): boolean`——两个世界像素点是否落在同一站立格 `(col,row,h)`,复用文件内已有的 `pixelToTile`。

- [ ] **Step 1: 写失败测试**

`collision.test.ts` 加(坐标按鬼 pos 1280,832 实算过):
```ts
import { sameTile } from './collision.js'

describe('sameTile(实体碰撞:两点是否同站立格)', () => {
  test('实体 pos 与自身同格', () => {
    expect(sameTile(1280, 832, 1280, 832)).toBe(true)
  })
  test('相邻 iso 站立格判不同格(一步 ±16/±8 必换 col/row/h)', () => {
    expect(sameTile(1280, 832, 1296, 840)).toBe(false) // → (40,52,h=1)
    expect(sameTile(1280, 832, 1264, 824)).toBe(false) // → (39,51,h=1)
  })
  test('同格内微小偏移仍同格', () => {
    expect(sameTile(1280, 832, 1281, 832)).toBe(true)
  })
})
```

- [ ] **Step 2: 跑失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/collision.test.ts`
Expected: FAIL(`sameTile` 未定义)

- [ ] **Step 3: 实现 sameTile**

`collision.ts` 加(`pixelToTile` 文件内已有,直接复用;放在 `buildIsBlocked` 附近):
```ts
/** 两个世界像素点是否落在同一站立格(col,row,h)。实体碰撞用:玩家目标格 == 实体格 → 挡。 */
export function sameTile(ax: number, ay: number, bx: number, by: number): boolean {
  const a = pixelToTile(ax, ay)
  const b = pixelToTile(bx, by)
  return a.col === b.col && a.row === b.row && a.h === b.h
}
```

- [ ] **Step 4: 测试通过 + commit**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/collision.test.ts` → PASS
Run: `pnpm --filter @type-pal/reforge run check` → 绿
```bash
git add packages/reforge/src/collision.ts packages/reforge/src/collision.test.ts
git commit -m "feat(reforge): collision 加 sameTile(实体碰撞用,复用菱形 pixelToTile)"
```

---

## Task 2: main isBlocked 接 entity collide + 浏览器验

**Files:** 改 `main.ts`

- [ ] **Step 1: isBlocked 包一层读 entity collide**

`main.ts`:
- import 改:`import { buildIsBlocked, sameTile } from './collision.js'`。
- `const isBlocked = buildIsBlocked(map)`(line ~188)改为:
```ts
const tileBlocked = buildIsBlocked(map)
// 静态实体碰撞:collide 实体占其 pos 所在格,玩家目标落该格 → 挡。
// 闭包读 entities 当前 pos(将来移动 NPC 也自然生效;静态阶段 pos 不变)。
const isBlocked = (x: number, y: number): boolean =>
  tileBlocked(x, y) ||
  guijieMinjuScene.entities.some((e) => e.collide === true && sameTile(x, y, e.pos.x, e.pos.y))
```
> `resolveMove`(line ~250)与 `?collision` debug 层(line ~177)都消费这个 `isBlocked`,自动同时生效——debug 层会把鬼格画红(禁入),正好佐证。

- [ ] **Step 2: check 绿**

Run: `pnpm --filter @type-pal/reforge run check` → typecheck + test 绿
Run: `pnpm exec biome check packages/reforge/src` → 0/0

- [ ] **Step 3: 浏览器验**

Run: `pnpm --filter @type-pal/reforge run dev`,走向鬼(在 1280,832)。
- [ ] 玩家**走到鬼相邻格停下、穿不过去**(对照:改之前能穿过)
- [ ] 撞停后按空格**仍能对话**(`INTERACT_RANGE=48` > 相邻格 ~18px,够得到)
- [ ] `?collision` debug 层:鬼所在格显示**红**(禁入)
- [ ] **四个方向**走向鬼都被挡(不只某一向),且玩家能从旁**绕过**(只挡那一格、不挡周围)

- [ ] **Step 4: commit**

```bash
git add packages/reforge/src/main.ts
git commit -m "feat(reforge): isBlocked 接 entity collide — 静态 NPC 碰撞(玩家不穿站着的鬼)"
```

---

## Note(可选,本计划不强制)

- `INTERACT_RANGE = 48`([main.ts:190](../../../packages/reforge/src/main.ts#L190))偏大(≈1.5 格),可能没贴到鬼就隔空对话。修碰撞后若觉手感松,可降到 ~24(撞停后约 18px 仍触发)。**非本计划必做**,手感裁决留作者——别擅自改,要改先问。

## Self-Review(计划作者自查,已过)

1. **覆盖**:死字段根因 → `sameTile`(T1)+ `isBlocked` 包一层读 collide(T2);浏览器验「穿不过 + 能对话 + 能绕」。✅
2. **范围**:只静态碰撞;移动/避让明确划归 [backlog 议题 15](../design-backlog.md),不蔓延。Note 里的 INTERACT_RANGE 标「可选、要改先问」。✅
3. **可测**:几何纯函数 `sameTile` 进 collision.ts 单测(坐标实算过);entity 碰撞集成靠浏览器(同 ② / palette 的务实偏离)。✅
4. **不破既有**:`resolveMove` 语义不动(撞停);`isBlocked` 两处消费方(move / debug)自动生效,无需各自改。✅
