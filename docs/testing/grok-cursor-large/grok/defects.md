# 缺陷与未完账

本文件只记录会停组的产品缺陷，以及因此不能计入的合同。不把缺陷改写成原版真值，也不修产品。

## G01

没有停组缺陷。`loader.ts` 在 `maxEntries === 1` 且 `protect()` 返回 `undefined` 时，重新装入 scene 0 会把刚写入的 scene 5 淘汰。G01-D06 按这个公开行为断言，evicted 为 `[0]` 再变成 `[0, 5]`。

## G02

没有停组的产品缺陷。

宿主 blocked，不计入新合同：本机 canvas `toBlob` 不保留 alpha 恰好为 1 的像素，也不保留 alpha 0 下面的非零 R。`png.ts:43` 仍按 `A>0` 写 opaque。给不出可观察输入，所以没有为这条路径新写断言，也没有把它写成产品缺陷。

`dialog-assets.ts:114` 的外层 catch 不可达：两个 loader 在 `Promise.all` 之前已经各自 catch。登记为 unreachable，不注入抛错去打它。

本批新合同 36，不是 40。多出来的分支已经由 png、P10、tileset-blob、dialog L23、rle-decode 的旧断言覆盖，记在 `contracts.json` 的 `existingProof`。目标 400/40/40 没有改小。

## G03

没有停组的产品缺陷。

`blitTile` 的 y<0 分支和 `writePixel` 的越界返回给出同一屏内像素。G03-A06 只锁定可见结果：跨过 y=0 时 (3,0) 为 9、(3,1) 为 0。能单独打掉 blit 裁剪的是 G03-A05 的 coverage：负列会写到 `coverage[5*320-1]`。

`addCoverTileEntries` 的负坐标用 `Math.trunc`。负的 dy/dx 在后面被 `dy < 0` / `dx < 0` 丢掉，trunc 与 floor 在能发出的瓦片上看不到差别。cover tile 的像素、blit_y 和远处不画已经在 `present.test.ts` 的 P0.b，记为 existing-proof，没有再写一条同像素合同。

本批新合同 33，不是 40。目标 400/40/40 没有改小。

## G04

没有停组的产品缺陷。

`screen-wave.ts` 在 shift 恰好为 0 或恰好为 320 时，去掉 `shift>0 && shift<320` 之后像素仍然不变，所以这条守卫本身不能靠这两个端点单独打红。G04-A03 改用波幅 4：行 0 的表值是 0 故不卷，行 7 左移 4。镜像行的可观察结果是 G04-A01 的第 16 行左移 290。

本批新合同 29，不是 40。行 0 左移 30、第二帧累计 86、level 0/4/10、dither 的 0xA2 与加一、deathHold、黑屏、RNG 备份、P12 的 advanceEffects 都已经有旧断言，记在 existing-proof。目标 400/40/40 没有改小。

## G05

没有停组的产品缺陷。

本批新合同 43。对话时序、翻页、旧坐标、默认等键图标位置、奇数旁白框、开场项 x 和结算中对齐已经有旧断言，记在 existing-proof，没有再写成同结果的新合同。目标 400/40/40 没有改小。

## G06

没有停组的产品缺陷。

本批新合同 48。翻页、已装备色、用物层现行数量 7、攻击预览 23、立绘、runtime 0 和 level 2 的毒间谍已经有旧断言，记在 existing-proof。目标 400/40/40 没有改小。

## G07

没有停组的产品缺陷。

确认框的默认色、右项高亮、关/开和三向阴影已经由 glm 盖满。开场菜单的 `y === undefined` 到不了：`ITEM_Y` 只有 95 和 112，`openingMenuLabels` 固定返回两项。记为 unreachable，不计入新合同。

本批新合同 47。两人体力、需要真气 8、价 123、现有 3、半价 40、九宫格和四字横坐标已经有旧断言，记在 existing-proof。目标 400/40/40 没有改小。

## G08

没有停组的产品缺陷。

单次染色、Y 序、死亡淡出未开始仍画、头像色函数返回值、dialogBox 整屏不画、升级斜杠与箭头、一字名实际字宽、偶数宽特效、飘字上移和寿命、背景索引 0 与色阶已经有旧断言，记在 existing-proof。

本批新合同 44。目标 400/40/40 没有改小。

## G09

没有停组的产品缺陷。

键位表、repeat、单源 detach、间隔 40/100、巨大 dt、paletteFade、battleFade、冻结达间隔、scene-fade 抑制、3/4、99 封顶、finish 100%、说明文案、onProgress 0.5、默认 12% 单调、按钮点击、168/336 和 precache-client 的注册与早到消息已经有旧断言，记在 existing-proof。`precache-ui.ts` 在 `document === undefined` 时返回空 widget，本 jsdom 到不了，记为 unreachable。

本批新合同 55。目标 400/40/40 没有改小。

## G10

没有停组的产品缺陷。

默认 Space 跳过、endFrame -1、窗口 [1,2]、震动耗尽、WIN95 块 68、下滑中途、上图长度不足、AVI 按下后移除、字符串 init 的 POST 和字形降级已经有旧断言，记在 existing-proof。`avi-player.ts:184` 在 `typeof document === 'undefined'` 时直接返回。本 jsdom 始终有 document，记为 unreachable `G10-UN-avi-document`。

本批新合同 25。累计 400/40/40。

## 全包资产环境

全包 `vitest run` 退出码 1。唯一失败套件是 `packages/game/src/dev/dev-panel.test.ts`。工作树没有 gitignore 的 `data/extracted/data/enemy-teams.json`，套件回调在收集阶段 `readFileSync` 抛出 ENOENT。主检出 `/Users/zhangxu/illegal/type-pal/data/extracted/data/enemy-teams.json` 存在。未复制真实数据，未改这条旧测。3145 条测试通过，13 条跳过。本卡新增测试均通过。这条环境异常单列给 Codex，全包不算绿。
