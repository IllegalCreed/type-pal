# e2e-own —— 自有内容烟测工程(回归 fixture)

模拟「作者从空白工程配好最小内容存盘」的产物:自有 16×16 双层地图(草地棋盘 +
h=2 occlude 矮墙带门)、自造量化 tileset(4 菱形瓦,原版同构 .rle)、独立碰撞层、
最小主角(battler 必填,缝隙 #5)。地图/tileset 为全自有；工程标准色表由工程自己生成并以
`color.project-standard` 登记 catalog；主角测试精灵登记为 `sprite.pal.002`——**id 沿用 PAL
命名习惯但该资源仍属少量 PAL 派生素材**（根 README 版权边界：fixture 未完成全部替换，
尚非版权清理完成）。

跑法:`VITE_PROJECT_ID=e2e-own pnpm --filter @type-pal/reforge exec vite --port 6052 --strictPort`
验证点:自有瓦渲染 / 行走 / 碰撞(墙+边界)/ 穿门 / h=2 墙前人盖墙、墙后墙盖脚。
产生器脚本见 W7 烟测记录(2026-07-10);缝隙清单见 docs/ops/archive/tasks/done/E2E-1-blank-project-playable.md。
