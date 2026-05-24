# M4 KNOWN_DEVIATIONS

> M4 P3.T7 全 294 scene sdlpal --dump-map vs render-tilemap 自动化 pixel diff 结果。
> 生成时间: 2026-05-24T09:09:11.313Z

**Summary**: total 294 | pass 293 (99.7%) | fail 0 | sdlpal-fail 1 | render-fail 0

## 失败 scene 清单

| sceneId | mapNum | status | diff px | err |
|---------|--------|--------|---------|-----|
| 294 | 0 | sdlpal-fail | - | Command failed: /Users/zhangxu/illegal/type-pal/build/sdlpal-classic/unix/sdlpal --dump-map 0 --out /Users/zhangxu/illeg |

## 处理建议

- `fail` (像素 diff > 100): tilemap 渲染 bug,留 M5/M7 排查
- `sdlpal-fail`: sdlpal --dump-map 该 mapNum 崩;可能 mapNum 数据异常,record skip
- `render-fail`: render-tilemap.ts 崩;查 scene-N.json 数据是否完整

## diff 图存放

`build/m4-maps-diff/{sceneId}.png` — 仅 fail 场景生成

## 原始报告

`build/m4-map-diff-report.json`