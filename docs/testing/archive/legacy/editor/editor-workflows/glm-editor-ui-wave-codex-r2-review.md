# GLM 编辑器十二模块 · G1–G3 返工独立复核

候选 `codex/glm-editor-ui-wave-r1@89d1be36fb41c4f12fd02d33816736f6d74ab01c`。
结论：**G1/G3 已闭，G2 仍有一项同根 counter；卡保持 rework**。未合 main，
未运行全仓 check、官方 ratchet 或 strict-fast，不把候选计入正式覆盖率。

## 已独立证实

- `ui/__tests__/glm-ui-wave-kit.ts:40-48` 经 `buildBlankProject`→`loadCurrentProjectFrom`→
  全量场景/地图→`toEditorState`→`assertProjectSaveValid`；U1/U2/U3 多处新状态另在
  添加资源后再过保存门。首轮“空 manifest/入口场景缺席”根因已撤回。
  这只证测试使用的会话状态，不证明每个下层 UI asset prop 都是真实例。
- 独立复跑候选十二文件 **39/39**、editor typecheck exit0、14 代码文件 Biome
  零诊断、`pnpm check:docs` PASS、diff check 干净；
  `node docs/testing/archive/legacy/batches/glm-editor-ui-wave/ui-wave-mutants.mjs wave` 的判据自测10类、
  绿对照及四针钉名业务红全部通过。机械门不替代下述业务输入核验。
- 直看 `/tmp/ui-wave-u2-sprite-library.png`：12 帧网格及活体预览可见；
  `/tmp/ui-wave-u4-scene-canvas.png`：场景素材可见。两图均不再出现首轮资源
  字节不符/加载失败横幅。G3 作为**隔离环境可加载的最小视觉证据**已闭，
  不据此宣称内容观感、全地图或录制链验收；两张临时图 SHA-256 分别为
  `d1297b12e88824bd8109afebe10966d5acabfef9816dae08437e18f551461ea2`、
  `3e80f13f2138a0f7fe95f6c10ba20116b5b7e951d5a4c2938b590a314290d149`。

## 唯一残项 G2-R2：声明的正式输入没有交给被测组件

1. `packages/editor/src/ui/PreviewCanvas.glm-ui-wave.test.tsx:73-75` 构造并检查
   `legalStages`（含合法对话 cue），但 `:106` 实际传给 `PreviewCanvas` 的却是
   `stages={[{ id:'s0', body:[] } as never]}`；`legalStages` 没有后续消费者。
   同一次渲染的 `:117-122` 又传空 catalog/maps、伪 reader/base，而 `:95`
   用强转的手写 Playback。回执“阶段为合法对话舞台”不成立；当前绿例只证明
   局部 toolbar 委派/防御，不能计为真实对话舞台进入预览的正控。
2. `packages/editor/src/ui/SceneCanvas.glm-ui-wave.test.tsx:68-83` 的会话状态已过
   保存门，但组件实际 props 在 `:158-163` 仍是空 `assetCatalog`、空 `tilesets`、
   `{}` 强转的 `assetBase/assetReader`；`:29-48` 的 `useSceneAssets` mock 将这些输入
   绕过并直接返回 ready。地图正文即使在会话状态里合法，也未通过组件的实际
   资产准备边界。当前用例可保留为确定性 pointer→callback 的局部测试，
   但不能按回执称“正式场景/地图/资产闭包的 SceneCanvas 正控”。

返工只处理上述两处：U4b 把经当前脚本守卫核过的舞台真正作为 `stages` 实参，
并使项目/场景身份与同一正式工程相符；若仍只测委派，撤销未消费舞台的证明语句。
U4a 给组件真实同源的 catalog/tilesets/reader/base（几何 hook 可隔离以保持指针
确定性），或明确降为局部 pointer 测试并撤回资产闭包正控声称；不可再用空 props
加 ready mock 冒充正式输入。其它 U1–U3 与 G3 不重开，不改产品/旧测/基线。
修后重跑定向、U4 对应单点针、typecheck、Biome 与 docs；再交一个 SHA。
