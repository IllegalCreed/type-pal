# Q-NEXT2 有限批逐合同排重账（r22）

来源：next2 派发与机器清单 packet（审核树 codex-lmn-acceptance 下
docs/testing/glm-tenfold-triple/codex-opq-next2-dispatch-20261002.md 与
codex-opq-next2-packet-20261002.json；按不 cherry-pick 纪律不链接，Codex 核定 14 条，
候选处置数非净新承诺）。主源 `packages/reforge/src/dither-transition.ts`（当前 main 与冻结字节一致，
不在 Cursor74/Grok46 主合同源）。新文件：`packages/reforge/src/dither-next2.glm-q.test.ts`
+ 专属 fixture `packages/reforge/src/__tests__/glm-q/next2/dither2.ts`。
四个代表产品控制由 Codex 在最终固定候选统一实采；旧 CLI14、五针、71 档案零改动。

排重总纲：旧 `dither-transition.test.ts` 的 palette 基表 256 条全 unique（红=index 保证
packRgb 不碰撞）、帧构造全部 offset-0 等长数组、controller 只证旧 owner false / 默认
AbortError / 普通 supersede。dupcheck「dither/nearest」语料仅旧文件自身与
scene-switch-transaction（旧 owner false）、script-runner（ditherScreen 阻塞）、
battle-anim（视觉 72 帧）——十四轴均无更强旧证，全部按新合同处置，无 existing-proof
扣列、无 blocked。旧 72 步顺序 / source·target 不变 / 正常 4× 格 / 普通 supersede /
旧 owner false / 默认 AbortError 不重领。

| id | 源条件 | 合法输入 | 精确 oracle | 旧证明限制（已核旧 fullName） |
|---|---|---|---|---|
| Q-NEXT2-01 重复 exact RGB 取首索引 | build:75-84 `if (!exact.has(key)) exact.set(key, index)` | 完整 256 表 + override 18:=基表[1]；像素 (1,73,151) | targetIndices[0]===1（非 18）、sourceLevels[0]===1 | 基表全 unique，重复轴无旧例 |
| Q-NEXT2-02 最近色用 G/B 距离 | build:86-105 全距 dr²+dg²+db² | 完整 256 表 + {5:[10,0,0], 6:[10,200,200]}；非精确 (10,199,199) | targetIndices[0]===6（红对 5/6 同距；只看红会取更早的 5） | 旧帧全 exact 色无最近距离 oracle |
| Q-NEXT2-03 同距取先 | build:98-101 严格 `<` | uniform(200,200,200) + {5:[0,0,0],6:[2,0,0]}；像素 (1,0,0) | targetIndices[0]===5 | 旧 unique exact 表不进同距 |
| Q-NEXT2-04 非精确零索引缓存 | build:88-89 resolved 缓存 + :103 set | uniform(200,200,200)+{0:[0,0,0)}；三像素同非精确 (1,1,1)（source/target 重复） | targetIndices/sourceLevels === [0,0,0] | exact 缓存旧证存在，非精确 0 身份读回无 |
| Q-NEXT2-05 palette 快照隔离 | build:74-83 独立 Uint8Array 快照 | 真实 build 后改 caller palette[0xc0] | plan.colors 逐字节不变 + apply 出原快照色 (192,192,64,255) | 旧 source/target 不变性 ≠ 输入 palette 快照隔离 |
| Q-NEXT2-06 输出容量上界 | apply:150-159 availablePixels 含输出 | 端点 3px、真实 plan 2px、输出 1px 非零偏移视图（owner 哨兵） | owner 全 12B 精确：前 4 哨兵 + [192,192,64,255] + 后 4 哨兵 | 旧钳制例输出与 source 等长，输出容量臂不控 |
| Q-NEXT2-07 真实 plan 容量上界 | apply:154-155 plan.sourceLevels.length | 真实 build 1px + 3px 端点/输出、请求 3 | 输出 = [结果 4B] + 8B 哨兵原样 | 旧 plan 与端点 min 对齐，无容量错配 |
| Q-NEXT2-08 非零偏移视图各用各 offset | apply:146-195 视图相对索引 | 三 owner 缓冲 subarray（source@4/target@8/output@4） | step0 全 source 拷贝；step1 像素 0 (192,192,64,255)+像素 1 source；视图外哨兵全保持；输入视图不变 | 旧帧 helper 全 offset-0 |
| Q-NEXT2-09 同背板异视图拒收 | apply:146-148 buffer 比较（OR 双臂） | output=new Uint8ClampedArray(同 buffer,16,4)（不相交、异对象），分别对 source/target | 两臂均精确 throw /独立/ | 旧只证 output===source 对象同一（left OR 臂），无同背板异视图/target 臂 |
| Q-NEXT2-10 零预算不动输出 | apply:157-159 safePixelCount=0 | 真实 plan 2px + 完整输入 + pixelCount=0 | 输出 8B 全哨兵；source/target 逐字节不变 | 旧 NaN visits ≠ apply 零预算路径 |
| Q-NEXT2-11 ragged 二维格 | apply:160-173 logicalWidth/logicalX/logicalY | width5·height5·scale2·step3，25px 全 exact 色 | 手算行掩码 11110/11110/11000/11000/11110 → 100B 全 RGBA（visited=(192,192,64,255)/unvisited=(0,0,0,255)） | 旧 4× 格 width8·scale4 全 logicalY 差异不可见、无 ragged 边 |
| Q-NEXT2-12 匹配 owner 取消 | cancelOwned:275-279 | 公开 beginEntry(owner) 后 cancelOwned(owner, reason) | 返回 true；rejects.toBe(精确对象)；active null | 旧 :180 只证非匹配 false |
| Q-NEXT2-13 快照失败保护旧 effect | beginSnapshot:258-259 先求值 snapshot() 再入 begin | beginEntry 后 beginSnapshot(throwing) | throw 同一 boom 对象；旧 active.backup 保持、Promise pending；finish 后 resolves | 旧快照成功/supersede 测试不能证失败捕获先于所有权转移 |
| Q-NEXT2-14 显式 reason 对象身份 | cancel:268-272 直传 reject | 公开 begin 后 cancel(custom Error) | rejects.toBe(同一对象) 非 AbortError 替换；active null | 旧只证默认 AbortError/name |

## 门禁与账

- 定向：reforge glm-q 112/112（旧 98 + 新 14，r22 实跑 JSON）；相邻 dither-transition +
  scene-switch-transaction 34/34；reforge 全包 **2164/2164**（2150 + 14）、typecheck 0。
- game 2812 / pal-extract 381 未触，明确复用；根 lint 完整 0/0/0、docs/diff/verifier
  见 wave-Q receipt（pin 后复跑）。
- 累计：**175 执行（161 + 14）/ 净新结构上限 174（扣 room0 旧合同，历史 C114 编号）/
  缺口至少 526**；反控 71 存档 / 62 目标 / 上限 61 不变（本批零新针，四代表控制留
  Codex 最终候选实采）。原 700/50 组/50 目标/10 流程不缩；本批完成 ≠ 整卡 done。
