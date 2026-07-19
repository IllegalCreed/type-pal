# e2e-own —— 纯自有内容烟测工程(回归 fixture)

模拟「作者从空白工程配好最小内容存盘」的产物:自有 16×16 双层地图(草地棋盘 +
h=2 occlude 矮墙带门)、自造量化 tileset(4 菱形瓦,原版同构 .rle)、独立碰撞层、
最小主角(battler 必填,缝隙 #5)。**不含任何原版地图/tileset 依赖**；工程标准色表由工程自己生成并以
`color.project-standard` 登记 catalog；主角测试精灵作为一等 `sprite.pal.002` 资源随工程自包含。

跑法:`VITE_PROJECT_ID=e2e-own pnpm --filter @type-pal/reforge exec vite --port 6052 --strictPort`
验证点:自有瓦渲染 / 行走 / 碰撞(墙+边界)/ 穿门 / h=2 墙前人盖墙、墙后墙盖脚。
产生器脚本见 W7 烟测记录(2026-07-10);缝隙清单见 docs/ops/tasks/E2E-1-blank-project-playable.md。
