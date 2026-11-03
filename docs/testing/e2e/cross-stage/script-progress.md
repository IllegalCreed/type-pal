# PAL 场景与实体脚本逐步骤进度

Status: active
Validity: current
Owner: Codex
Last reviewed: 2026-11-04
Template: plan-status-v1 / 1.0.0

## 目标与时间范围

从2026-11-04起持续记录当前canonical场景`onEnter/onTeleport`与实体`trigger/auto`每个步骤的
脚本核对、预览初态和优化进度。入口身份含场景、实体、通道、方案、步骤；首次、回访、恢复等
实际调用现场用独立context区分。物品私有、共享库、敌人和技能脚本不计入本清单分母。

本页是唯一持久台账，下面唯一命名JSON围栏由[只读查询工具](../../../../scripts/script-governance/progress-report.mjs)
消费；未记录步骤由当前工程自动枚举为未核，不能因未出现于事件中而遗漏。流程和证据要求见
[E2E逐步骤合同](../contract.md#npc与场景脚本的逐步骤进度用户2026-11-04)，本轮接入和初态补齐归
[R4任务卡](../../../tasks/cards/E2E-R4-1-route-and-checkpoint-foundation.md)。历史done和旧执行不自动转为当前步骤完成。

## 里程碑

| 结果 | Owner | 状态 | 证据与接受边界 |
|---|---|---|---|
| 当前步骤全量枚举与三个独立进度轴 | Codex | active | 查询工具按canonical身份读取；结构检查不授脚本或初态完成信用 |
| 001–006逐入口实态与编辑器持久化记录 | Codex | active | 仅将R4实际核对、保存、重开、播放/重置证据追加到事件；未录入的不算已验 |
| 后续片段与脚本优化持续推进 | Codex | planned | 沿逐步骤合同更新，不以片段总状态替代各轴记录 |

## 当前状态

当前机器记录如下。事件按实际记录时间追加，`from`连接该入口/context/轴的上一个记录状态；
查询分别保留记录状态和受源码、依赖、证据、预览变化影响后的待复核状态。本页不另维护手工完成总数。

```json script-progress-ledger
{
  "kind": "type-pal-script-progress",
  "version": 1,
  "project": "pal",
  "scope": "scene-hooks-and-entity-behavior-steps",
  "events": [
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v2-r2-o12",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s000",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v2:run2:command12",
        "description": "E2E 001; s000/scene/onEnter/default/initial; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=2; sceneSession=s000:1; runId=2; firstCommandOrder=12; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "eb3b36fa2c8c041ab8778f72ede2de9066a0624e67aafc8bb989f68d3593884c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=2, order=12, sceneVisit=2, first path=[\"initial\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s000\",\"slot\":\"onEnter\",\"hook\":\"default\",\"sceneSession\":\"s000:1\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v4-r5-o963",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v4:run5:command963",
        "description": "E2E 001; s001/scene/onEnter/default/initial; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=4; sceneSession=s001:2; runId=5; firstCommandOrder=963; path=[\"initial\",\"entry\",\"prepare\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "67d6016d72f02cee0f59e1bc21b02ac1ccbd1eb11ad9385a3604d80b184beb3e",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=5, order=963, sceneVisit=4, first path=[\"initial\",\"entry\",\"prepare\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s001\",\"slot\":\"onEnter\",\"hook\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v4-r9-o6454",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "auto",
        "schemeId": "leave-bedroom",
        "stageId": "leave",
        "entityId": "e10"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v4:run9:command6454",
        "description": "E2E 001; s001/e10/auto/leave-bedroom/leave; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=4; sceneSession=s001:2; runId=9; firstCommandOrder=6454; path=[\"leave\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "3c46baaf6c1c77f582d2b70582acd8c03cce70fd492e8ac04f828fc597590d52",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=9, order=6454, sceneVisit=4, first path=[\"leave\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e10\",\"channel\":\"auto\",\"behavior\":\"leave-bedroom\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e001-s001-e10-auto-leave-bedroom-leave 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v4-r12-o8739",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e25"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v4:run12:command8739",
        "description": "E2E 001; s001/e25/auto/default/initial; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=4; sceneSession=s001:2; runId=12; firstCommandOrder=8739; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "unreviewed",
      "sourceFingerprint": "b567d2163c12140b4a78206470c068262def6dd4b14bca0978c0db123100c11f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=12, order=8739, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e25\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 缺口：e25 无本入口真实pose，保持unreviewed；不能用静态默认补造。 候选状态 e2e001-s001-e25-auto-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v4-r5-o528",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e3"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v4:run5:command528",
        "description": "E2E 002; s001/e3/trigger/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=4; sceneSession=s001:2; runId=5; firstCommandOrder=528; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "6be7083bb262ae9a5fd07048fc3995a64ec0b2fa4c8585c99132508cedb0c8a9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=5, order=528, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e3\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e002-s001-e3-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r11-o1093",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e62"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run11:command1093",
        "description": "E2E 002; s003/e62/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=11; firstCommandOrder=1093; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "cac57d6ef6a774e1692111af0607b065e95e84f24b9adc89271e774eb6e67cef",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=11, order=1093, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e62\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r14-o1096",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e63"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run14:command1096",
        "description": "E2E 002; s003/e63/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=14; firstCommandOrder=1096; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "3f57efbe15271fd1d6faddb9bb23588cf0e8082c2530391662b37826e7f8c367",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=14, order=1096, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e63\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r17-o1097",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e64"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run17:command1097",
        "description": "E2E 002; s003/e64/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=17; firstCommandOrder=1097; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "352326cca14b4fb0be2a73413d409aca111d0c8711606aebcd1a220eebdaefa6",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=17, order=1097, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e64\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r20-o1098",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e75"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run20:command1098",
        "description": "E2E 002; s003/e75/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=20; firstCommandOrder=1098; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "bad6032f8bedfb2a7087689445247651d8867c95a68fac74a51cbb3876009783",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=20, order=1098, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e75\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r22-o2590",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run22:command2590",
        "description": "E2E 002; s003/e56/trigger/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=22; firstCommandOrder=2590; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "69a3e31e7d147c6a74b74a5106cd7ef84f984c96c4f226e83099fcbfe3d4f934",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=22, order=2590, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e9 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r26-o6576",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-006",
        "stageId": "leave-reception",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run26:command6576",
        "description": "E2E 002; s003/e56/auto/legacy-006/leave-reception; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=26; firstCommandOrder=6576; path=[\"leave-reception\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "833c72d7a9e71f98cf3d80ec51f6be24aebd18549fae4174c39edc2bb0256350",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=26, order=6576, sceneVisit=6, first path=[\"leave-reception\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"auto\",\"behavior\":\"legacy-006\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e002-s003-e56-auto-legacy-006-leave-reception 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r29-o7041",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "initial",
        "entityId": "e59"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run29:command7041",
        "description": "E2E 002; s003/e59/auto/legacy-003/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=29; firstCommandOrder=7041; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "b3f18163b206e870bc3ac9fbeb317895641e2d57010f721da518ffd1a5ed8223",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=29, order=7041, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e59\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e24 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e002-s003-e59-auto-legacy-003-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r32-o7054",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "initial",
        "entityId": "e60"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run32:command7054",
        "description": "E2E 002; s003/e60/auto/legacy-003/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=32; firstCommandOrder=7054; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "04989caac0fb691965e5d0bac40a9150b7cef3c411bbd8acf74b3b5d06749aa3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=32, order=7054, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e60\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e25 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e002-s003-e59-auto-legacy-003-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r35-o7066",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "initial",
        "entityId": "e61"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run35:command7066",
        "description": "E2E 002; s003/e61/auto/legacy-003/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=35; firstCommandOrder=7066; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "28edb59edd7d9b2eb66031f2eaacc01097d294796318845029f8ebe2cce39ba0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=35, order=7066, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e61\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e26 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e002-s003-e59-auto-legacy-003-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r14-o927",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e47"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run14:command927",
        "description": "E2E 003; s003/e47/trigger/default/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=14; firstCommandOrder=927; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "a8fdf24a679ab1ab19af85d594f945f99e492a7b342f602b4b7c61f5e704caae",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=14, order=927, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e47\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s003-e47-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r17-o2626",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "greet-after-guests",
        "stageId": "initial",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run17:command2626",
        "description": "E2E 003; s003/e56/trigger/greet-after-guests/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=17; firstCommandOrder=2626; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "f630886915fc58fedcdfad540ba951f62b7319401f046ff0511145a368875685",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=17, order=2626, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"trigger\",\"behavior\":\"greet-after-guests\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s003-e47-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r21-o3191",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "go-to-kitchen",
        "stageId": "initial",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run21:command3191",
        "description": "E2E 003; s003/e56/auto/go-to-kitchen/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=21; firstCommandOrder=3191; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "ef717f092d63820af4564e07f61af584c38ef49550200415ab6716b581613c7f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=21, order=3191, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"auto\",\"behavior\":\"go-to-kitchen\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e19 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e003-s003-e56-auto-go-to-kitchen-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r23-o4649",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "beggar-first-talk",
        "stageId": "initial",
        "entityId": "e62"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run23:command4649",
        "description": "E2E 003; s003/e62/trigger/beggar-first-talk/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=23; firstCommandOrder=4649; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "91ec732ef646cf675bcc423b596c5d184c21af26b7f341695c8643c295bb99a3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=23, order=4649, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e62\",\"channel\":\"trigger\",\"behavior\":\"beggar-first-talk\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e19, s001/e20 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e003-s003-e62-trigger-beggar-first-talk-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r26-o7459",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e53"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run26:command7459",
        "description": "E2E 003; s003/e53/trigger/default/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=26; firstCommandOrder=7459; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "aa3b315875831b8adea435741d94d3d496923f81f33d20f18863d2f320a34887",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=26, order=7459, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e53\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v6-r34-o9394",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "serve-guests",
        "stageId": "initial",
        "entityId": "e19"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v6:run34:command9394",
        "description": "E2E 003; s001/e19/trigger/serve-guests/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=6; sceneSession=s001:3; runId=34; firstCommandOrder=9394; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "bd8410095874347fe2dfa41a043d111ace2bfca78d5a9b88982e8836b79f7dc0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=34, order=9394, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e19\",\"channel\":\"trigger\",\"behavior\":\"serve-guests\",\"sceneSession\":\"s001:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s001-e19-trigger-serve-guests-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v4-r5-o541",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "take-dishes",
        "stageId": "initial",
        "entityId": "e20"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v4:run5:command541",
        "description": "E2E 004; s001/e20/trigger/take-dishes/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=4; sceneSession=s001:2; runId=5; firstCommandOrder=541; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "146bfae214b604636dc6773d61bd2e7e7fdb87db44bc0df25588e8125d10ad09",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=5, order=541, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e20\",\"channel\":\"trigger\",\"behavior\":\"take-dishes\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s003/e62 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e003-s001-e19-trigger-serve-guests-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v4-r8-o1473",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e18"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v4:run8:command1473",
        "description": "E2E 004; s001/e18/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=4; sceneSession=s001:2; runId=8; firstCommandOrder=1473; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "a782161bb0cefbaaf62dd057afc73ca2b363ab02b2cb74358d8eaf5ad06929ec",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=8, order=1473, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e18\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e004-s001-e18-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v6-r25-o3133",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e46"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v6:run25:command3133",
        "description": "E2E 004; s003/e46/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=6; sceneSession=s003:3; runId=25; firstCommandOrder=3133; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "26ac8722e913f93f432ce390511d19719eb0cc98a076e7b890413f8a3316c524",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=25, order=3133, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e46\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v6-r28-o4915",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e51"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v6:run28:command4915",
        "description": "E2E 004; s003/e51/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=6; sceneSession=s003:3; runId=28; firstCommandOrder=4915; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "6f13a536f14982ddca13d51579ebae26a213ea75f86dee77716fbcdb957c3b4d",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=28, order=4915, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e51\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v8-r36-o5697",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e15"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v8:run36:command5697",
        "description": "E2E 004; s001/e15/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=8; sceneSession=s001:4; runId=36; firstCommandOrder=5697; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "193706d73c885915b93f5fdfdcc3f1fb07f3e7d30cea7a0be06e9981ffcc2a93",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=36, order=5697, sceneVisit=8, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e15\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s003/e62 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e004-s001-e18-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v8-r40-o8348",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "routine",
        "entityId": "e26"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v8:run40:command8348",
        "description": "E2E 004; s001/e26/auto/legacy-003/routine; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=8; sceneSession=s001:4; runId=40; firstCommandOrder=8348; path=[\"routine\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "784218f5a63949b4033ed2ee60358862327a2e1714dac698bbcd0fffdc6ca98d",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=40, order=8348, sceneVisit=8, first path=[\"routine\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e26\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s001:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e004-s001-e26-auto-legacy-003-routine 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v8-r42-o9284",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e12"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v8:run42:command9284",
        "description": "E2E 004; s001/e12/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=8; sceneSession=s001:4; runId=42; firstCommandOrder=9284; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "2b6d9f595b88d1d9f5b5bb621f9335c21a1889834b8690e59e68110fc0703623",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=42, order=9284, sceneVisit=8, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e12\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e004-s001-e12-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v10-r59-o10948",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e47"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v10:run59:command10948",
        "description": "E2E 004; s003/e47/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=10; sceneSession=s003:5; runId=59; firstCommandOrder=10948; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "a8fdf24a679ab1ab19af85d594f945f99e492a7b342f602b4b7c61f5e704caae",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=59, order=10948, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e47\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e003-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v10-r65-o13425",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "c8-321c0a7d7de1",
        "stageId": "stage-1",
        "entityId": "e62"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v10:run65:command13425",
        "description": "E2E 004; s003/e62/trigger/c8-321c0a7d7de1/stage-1; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=10; sceneSession=s003:5; runId=65; firstCommandOrder=13425; path=[\"stage-1\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "0c65a3b5bf291c4613045c2ec1887e7e5c098689ae5fe5752541eb02ffffb341",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=65, order=13425, sceneVisit=10, first path=[\"stage-1\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e62\",\"channel\":\"trigger\",\"behavior\":\"c8-321c0a7d7de1\",\"sceneSession\":\"s003:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s001/e16, s001/e19 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e003-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v4-r11-o1123",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e53"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v4:run11:command1123",
        "description": "E2E 005; s003/e53/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=4; sceneSession=s003:2; runId=11; firstCommandOrder=1123; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "aa3b315875831b8adea435741d94d3d496923f81f33d20f18863d2f320a34887",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=11, order=1123, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e53\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v6-r19-o2708",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "c8-74bc98f07f8e",
        "stageId": "stage-1",
        "entityId": "e19"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v6:run19:command2708",
        "description": "E2E 005; s001/e19/trigger/c8-74bc98f07f8e/stage-1; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=6; sceneSession=s001:3; runId=19; firstCommandOrder=2708; path=[\"stage-1\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "c185f4741152e43b04c9ccb9fd40ee39a5f06c3512142ea4a1251485e542c9ca",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=19, order=2708, sceneVisit=6, first path=[\"stage-1\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e19\",\"channel\":\"trigger\",\"behavior\":\"c8-74bc98f07f8e\",\"sceneSession\":\"s001:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s001-e19-trigger-c8-74bc98f07f8e-stage-1 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v6-r22-o4629",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e18"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v6:run22:command4629",
        "description": "E2E 005; s001/e18/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=6; sceneSession=s001:3; runId=22; firstCommandOrder=4629; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "a782161bb0cefbaaf62dd057afc73ca2b363ab02b2cb74358d8eaf5ad06929ec",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=22, order=4629, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e18\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s001-e19-trigger-c8-74bc98f07f8e-stage-1 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v8-r36-o6276",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e44"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v8:run36:command6276",
        "description": "E2E 005; s003/e44/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=8; sceneSession=s003:4; runId=36; firstCommandOrder=6276; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "c939c5ebd9f925b923f5cd3d5b213b7005296c3ad83a504671f7874ab5ca8fa1",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=36, order=6276, sceneVisit=8, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e44\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s003-e53-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r42-o7099",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e76"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run42:command7099",
        "description": "E2E 005; s004/e76/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=42; firstCommandOrder=7099; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "f45d2820953f4a410d0f39be43e2ec2bb99d2ec768d24348348cad68dfbdc04c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=42, order=7099, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e76\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r45-o7100",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e77"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run45:command7100",
        "description": "E2E 005; s004/e77/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=45; firstCommandOrder=7100; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "99ee6fc8b2f693c618dbda368706dd8a4330983db0ad9b7843cdaa100d4bb458",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=45, order=7100, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e77\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r48-o7101",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e82"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run48:command7101",
        "description": "E2E 005; s004/e82/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=48; firstCommandOrder=7101; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "35a48ca4cbffff268c6b91e038fe50398ea19b8a0671646f6fae046ab8f9532f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=48, order=7101, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e82\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r51-o7102",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e83"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run51:command7102",
        "description": "E2E 005; s004/e83/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=51; firstCommandOrder=7102; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "2e54be6c7038ccec38645a311434aeb48c7982e0650f921583a8e0e7a33eb4d9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=51, order=7102, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e83\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r54-o7103",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e84"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run54:command7103",
        "description": "E2E 005; s004/e84/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=54; firstCommandOrder=7103; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "f462cfcd8efd8e01347362dc3ed0b9c0f377dcd21036d1cf3f23f8cdd393a682",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=54, order=7103, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e84\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r57-o7104",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e85"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run57:command7104",
        "description": "E2E 005; s004/e85/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=57; firstCommandOrder=7104; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "902c467391d31baaeeb81a30fcb914c025f2eed389b0201568893daa7a7cf1e5",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=57, order=7104, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e85\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r60-o7105",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e86"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run60:command7105",
        "description": "E2E 005; s004/e86/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=60; firstCommandOrder=7105; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "b4709da61840f69f973a3bf214c4e30c3bc816a53120c7f90061e89afda1a42c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=60, order=7105, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e86\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r63-o7106",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e87"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run63:command7106",
        "description": "E2E 005; s004/e87/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=63; firstCommandOrder=7106; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "1da0d8397f5870934ee07a5ea83135a2a7caa8a36d52c1f60f9205eff24bf21f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=63, order=7106, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e87\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r66-o7107",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e89"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run66:command7107",
        "description": "E2E 005; s004/e89/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=66; firstCommandOrder=7107; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "59d6aaf0359cbbf27f531d890e38d40fb1779247b6de98f6e71ec7e27a5c1287",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=66, order=7107, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e89\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r69-o7108",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e90"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run69:command7108",
        "description": "E2E 005; s004/e90/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=69; firstCommandOrder=7108; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "73e40c302b60ef080af0b62a44da6b901798c0bcf216fec745c33fbc8061b5dd",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=69, order=7108, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e90\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r72-o7109",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e91"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run72:command7109",
        "description": "E2E 005; s004/e91/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=72; firstCommandOrder=7109; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "ba3a122e25f09fc7916e857e837e51f68ab4250f27d19d5ab3a70c7bae531df8",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=72, order=7109, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e91\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r75-o7110",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e92"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run75:command7110",
        "description": "E2E 005; s004/e92/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=75; firstCommandOrder=7110; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "006cba0095d6f628fcc184c78350cdd07b9b8b14eae60b0429478b5d27609b5b",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=75, order=7110, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e92\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r78-o7111",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "patrol",
        "entityId": "e93"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run78:command7111",
        "description": "E2E 005; s004/e93/auto/default/patrol; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=78; firstCommandOrder=7111; path=[\"patrol\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "3dbb1cee172b5656a1a8fc650769e319e728c2092d530a289ce9cbfdf2320ad1",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=78, order=7111, sceneVisit=10, first path=[\"patrol\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e93\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r81-o7112",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e101"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run81:command7112",
        "description": "E2E 005; s004/e101/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=81; firstCommandOrder=7112; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "352367e60a1908ac20a50d3f9d0c10f22e24db9c5e0d45049f05380fdf8b617b",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=81, order=7112, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e101\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r84-o7113",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e102"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run84:command7113",
        "description": "E2E 005; s004/e102/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=84; firstCommandOrder=7113; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "b57b5a957d038d1151d52b75fb1dca474cb60ba76580cc12389120f6627b1ae7",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=84, order=7113, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e102\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r87-o7114",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e103"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run87:command7114",
        "description": "E2E 005; s004/e103/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=87; firstCommandOrder=7114; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "15e1fc32b9a62654c4c64a7adcd575d5b7e09a618c3806cfbdc311aa2f1f62b8",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=87, order=7114, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e103\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r90-o7115",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e104"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run90:command7115",
        "description": "E2E 005; s004/e104/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=90; firstCommandOrder=7115; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "0ca0193a33894f8f3c240ea6dc3f52d906737d1708672e3aa0785a5abadd998c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=90, order=7115, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e104\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r93-o7116",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e112"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run93:command7116",
        "description": "E2E 005; s004/e112/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=93; firstCommandOrder=7116; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "6e2e3c09870242c2ad0b243142d06195d7433bab287f95ba479e4b647296092c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=93, order=7116, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e112\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r96-o7117",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e114"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run96:command7117",
        "description": "E2E 005; s004/e114/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=96; firstCommandOrder=7117; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "f812b430e6a5085bea0a52abe9c1c0e017b1f491bbdf728b3f792735b228b9c3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=96, order=7117, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e114\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r98-o7188",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run98:command7188",
        "description": "E2E 005; s004/scene/onEnter/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=98; firstCommandOrder=7188; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "87b9bee4cce57c7de79a6603a68deed9b688bef4ed086ff995a98a0a53237a6f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=98, order=7188, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s004\",\"slot\":\"onEnter\",\"hook\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r101-o23423",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e95"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run101:command23423",
        "description": "E2E 005; s004/e95/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=101; firstCommandOrder=23423; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "45483c07deba1ef9feac4b5f4d6447b38db27e0fe689ece0c74eca2e21289df5",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=101, order=23423, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e95\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s004-e95-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r107-o25899",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "patrol",
        "entityId": "e121"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run107:command25899",
        "description": "E2E 005; s005/e121/auto/default/patrol; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=107; firstCommandOrder=25899; path=[\"patrol\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "b671976953dc9030e42b5c6c8849ec129664fe44ba7cc7dc4bd768f56e1a10ce",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=107, order=25899, sceneVisit=12, first path=[\"patrol\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e121\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r110-o25900",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "patrol",
        "entityId": "e122"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run110:command25900",
        "description": "E2E 005; s005/e122/auto/default/patrol; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=110; firstCommandOrder=25900; path=[\"patrol\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "44b724f7ea2b415f73a0e6f252d4c502410c5daa40a958d4d2aad8656cd91af9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=110, order=25900, sceneVisit=12, first path=[\"patrol\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e122\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r113-o25901",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e127"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run113:command25901",
        "description": "E2E 005; s005/e127/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=113; firstCommandOrder=25901; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "22da6ff28148aff39e30d7ca69a525c1168d5e62396e8e722ed4f1aa4c128865",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=113, order=25901, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e127\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r116-o25902",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e128"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run116:command25902",
        "description": "E2E 005; s005/e128/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=116; firstCommandOrder=25902; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "f7e207a1173afb7c93fc33c7f161904f5ab09161a36ff444a22565b917ebd45a",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=116, order=25902, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e128\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r119-o25903",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e129"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run119:command25903",
        "description": "E2E 005; s005/e129/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=119; firstCommandOrder=25903; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "13171973fb8de8e0097be7bf8b3465118e43bde7cb81666222b5fffde2d75b62",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=119, order=25903, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e129\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r122-o25904",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e130"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run122:command25904",
        "description": "E2E 005; s005/e130/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=122; firstCommandOrder=25904; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "cad156412b980a462aa6490289444bc3f40ba04bb23cd7d748761b7717390cf3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=122, order=25904, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e130\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r125-o25905",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e131"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run125:command25905",
        "description": "E2E 005; s005/e131/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=125; firstCommandOrder=25905; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "49e3b54271598642a1a7a92b0129cc3f1ae76f0e1bdaf815413b0d287260fd69",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=125, order=25905, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e131\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r128-o25906",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e132"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run128:command25906",
        "description": "E2E 005; s005/e132/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=128; firstCommandOrder=25906; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "1b696a1f36a9e71b2d8cc19da012cff6dfa384628799a4844618283711ee5938",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=128, order=25906, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e132\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r131-o25907",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e133"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run131:command25907",
        "description": "E2E 005; s005/e133/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=131; firstCommandOrder=25907; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "d5917d7a8dff530c9fb6c794a3103f79e25cf746131566a98ff0f47723065662",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=131, order=25907, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e133\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r134-o25908",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e134"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run134:command25908",
        "description": "E2E 005; s005/e134/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=134; firstCommandOrder=25908; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "18279ed85e94e511a07e69e830fbc178fea9ee622da6e6d2970c614681d128db",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=134, order=25908, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e134\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r137-o25909",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e135"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run137:command25909",
        "description": "E2E 005; s005/e135/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=137; firstCommandOrder=25909; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "5d497e8fd76b8e836aa114a6fa2788c4c7a667747c0cf0b8ddc2739074aa1d2f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=137, order=25909, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e135\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r140-o25910",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e137"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run140:command25910",
        "description": "E2E 005; s005/e137/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=140; firstCommandOrder=25910; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "ac8145076f93fe88a63a4a7ea3d3c859394ecf1e21f93a7d17ff7b9d9d92d557",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=140, order=25910, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e137\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r143-o25911",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e138"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run143:command25911",
        "description": "E2E 005; s005/e138/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=143; firstCommandOrder=25911; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "90378680a6f186ab92815e2576b79059831fa3a5a0ac6448f6472a07e0846117",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=143, order=25911, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e138\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 该投影相对已观察NPC的runtime默认无差异；仍未授逐入口UI验收。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r145-o33759",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e127"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run145:command33759",
        "description": "E2E 005; s005/e127/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=145; firstCommandOrder=33759; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "75fe50b6624f1542dbca17817c12c81bdb4523c7f9cff107dc0bf9d33aec87d4",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=145, order=33759, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e127\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s005-e127-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r148-o40398",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e124"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run148:command40398",
        "description": "E2E 005; s005/e124/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=148; firstCommandOrder=40398; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "04ceec89cf13fed9ae78fc1d4d411541a0a47fde1b52f20505ced39f304b2900",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=148, order=40398, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e124\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s005-e124-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r151-o48752",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "legacy-001",
        "stageId": "initial",
        "entityId": "e123"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run151:command48752",
        "description": "E2E 005; s005/e123/trigger/legacy-001/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=151; firstCommandOrder=48752; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "168be88408611023c27bdbfde542cb1ce96b2dd0e07d5592245d04fb441ac550",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=151, order=48752, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e123\",\"channel\":\"trigger\",\"behavior\":\"legacy-001\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s005-e123-trigger-legacy-001-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r154-o63741",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e115"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run154:command63741",
        "description": "E2E 005; s005/e115/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=154; firstCommandOrder=63741; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "f43c4b601e185cccf8a436144392fc29893d9293b076da6b86769235e3bf85a9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=154, order=63741, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e115\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s005-e115-trigger-default-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r216-o65660",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "onEnter",
        "schemeId": "legacy-003",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run216:command65660",
        "description": "E2E 005; s004/scene/onEnter/legacy-003/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=216; firstCommandOrder=65660; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "3feb51a7795612ad057b57dd1126575942c8235b25c4a446281db0acde8622a8",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=216, order=65660, sceneVisit=14, first path=[\"initial\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s004\",\"slot\":\"onEnter\",\"hook\":\"legacy-003\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s004-scene-onEnter-legacy-003-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r219-o65702",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "trigger",
        "schemeId": "report-aunt-illness",
        "stageId": "report",
        "entityId": "e83"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run219:command65702",
        "description": "E2E 005; s004/e83/trigger/report-aunt-illness/report; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=219; firstCommandOrder=65702; path=[\"report\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "c2daadba056dc75c96632d14cdc1eb2e981ec82c25ec57636d9e6ffb3d436eb0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s002.json",
          "sha256": "3a7fd2b765f0f6b73d62aa594ed4f9961e04e1a6d43e656b1758aaefd9078ed4"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/scenes/s010.json",
          "sha256": "b505cd441b738bdcbce2e2478da7ed4243e2a5632986aa336cd88eadd3153dbf"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=219, order=65702, sceneVisit=14, first path=[\"report\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e83\",\"channel\":\"trigger\",\"behavior\":\"report-aunt-illness\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 跨场景目标 s002/e36, s010/e191, s002/e35, s002/e34, s001/e19, s001/e24, s001/e25, s001/e26 没有在本场景获得可视预览验收；依赖含前驱场景与明确跨场景来源。 候选状态 e2e005-s004-scene-onEnter-legacy-003-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r222-o72017",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "legacy-001",
        "stageId": "routine",
        "entityId": "e88"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run222:command72017",
        "description": "E2E 005; s004/e88/auto/legacy-001/routine; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=222; firstCommandOrder=72017; path=[\"routine\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "287d89e94c537892c9a934100a3a4eedfe055ee411847a0d978aa7f9ac877148",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=222, order=72017, sceneVisit=14, first path=[\"routine\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e88\",\"channel\":\"auto\",\"behavior\":\"legacy-001\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s004-e88-auto-legacy-001-routine 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r225-o72752",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "legacy-002",
        "stageId": "initial",
        "entityId": "e83"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run225:command72752",
        "description": "E2E 005; s004/e83/auto/legacy-002/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=225; firstCommandOrder=72752; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "b6a74216bca67f1837da4bcf6c4359883a8d20b3e4239479e532ef35f55f0c0a",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=225, order=72752, sceneVisit=14, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e83\",\"channel\":\"auto\",\"behavior\":\"legacy-002\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        }
      ],
      "note": "只记录实际执行前静态NPC显示字段证据；未授脚本审查、优化、UI配置/保存/重开/播放/重置完成信用。 候选状态 e2e005-s004-e83-auto-legacy-002-initial 只作组装定位，不是已保存证明。"
    },
    {
      "id": "e2e006-initial-reuse-s002-e35-trigger-default-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s002",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e35"
      },
      "context": {
        "id": "e2e006-20261027-reused:s002/e35/trigger/default/initial:v8:r84:o23081",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=8; sceneSession=s002:4; runId=84; firstCommandOrder=23081; originalAuditRunStartedOrder=23080; UI File/Open/Play/Reset at 2026-10-27T01:18:06.543Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "8c718d2f4b3ff64c6102dcbdaa2c0e9a7f21a47552b4d7ff6b6608f93848c808",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s002.json",
          "sha256": "3a7fd2b765f0f6b73d62aa594ed4f9961e04e1a6d43e656b1758aaefd9078ed4"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=1; entry=s002/e35/trigger/default/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=23081, runStartedOrder=23080; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s002-e35-trigger-initial",
        "selection": "default"
      },
      "previewFingerprint": "cb6e1a01498c4d95bf59a9442b6e9fc48f5f99421e363266feb89e558f251bb9"
    },
    {
      "id": "e2e006-initial-reuse-s002-e36-trigger-default-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s002",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e36"
      },
      "context": {
        "id": "e2e006-20261027-reused:s002/e36/trigger/default/initial:v8:r89:o25224",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=8; sceneSession=s002:4; runId=89; firstCommandOrder=25224; originalAuditRunStartedOrder=25223; UI File/Open/Play/Reset at 2026-10-27T01:18:16.416Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "7a3ec8806b4344447b382576814e7a9fd5dc54f52a881c7ca6dd66571fcac075",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s002.json",
          "sha256": "3a7fd2b765f0f6b73d62aa594ed4f9961e04e1a6d43e656b1758aaefd9078ed4"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=2; entry=s002/e36/trigger/default/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=25224, runStartedOrder=25223; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s002-e36-trigger-initial",
        "selection": "default"
      },
      "previewFingerprint": "a433b7d5a001948725161ceda13e109ab100a7dbc8f4090d14c29d058c92779e"
    },
    {
      "id": "e2e006-initial-reuse-s002-e36-trigger-default-legacy-002",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s002",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "legacy-002",
        "entityId": "e36"
      },
      "context": {
        "id": "e2e006-20261027-reused:s002/e36/trigger/default/legacy-002:v8:r92:o27019",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=8; sceneSession=s002:4; runId=92; firstCommandOrder=27019; originalAuditRunStartedOrder=27018; UI File/Open/Play/Reset at 2026-10-27T01:18:19.375Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "389cafedb55f00ecba818f32c0b00f9c8eba8cdaaaf6ccd1924692f021f899cb",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s002.json",
          "sha256": "3a7fd2b765f0f6b73d62aa594ed4f9961e04e1a6d43e656b1758aaefd9078ed4"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=3; entry=s002/e36/trigger/default/legacy-002; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=27019, runStartedOrder=27018; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s002-e36-trigger-legacy-002",
        "selection": "default"
      },
      "previewFingerprint": "77ced8d9ef9d666b9dc2da1e759a7595bbcdf852bcf8687737b89f63757b1bd1"
    },
    {
      "id": "e2e006-initial-reuse-s002-e36-trigger-default-legacy-003",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s002",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "legacy-003",
        "entityId": "e36"
      },
      "context": {
        "id": "e2e006-20261027-reused:s002/e36/trigger/default/legacy-003:v8:r95:o27361",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=8; sceneSession=s002:4; runId=95; firstCommandOrder=27361; originalAuditRunStartedOrder=27360; UI File/Open/Play/Reset at 2026-10-27T01:18:22.328Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "9d6805c65f9539c1e7eb3a0489beb664da1371760f0bd7a8f96cc880377e5366",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s002.json",
          "sha256": "3a7fd2b765f0f6b73d62aa594ed4f9961e04e1a6d43e656b1758aaefd9078ed4"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=4; entry=s002/e36/trigger/default/legacy-003; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=27361, runStartedOrder=27360; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s002-e36-trigger-legacy-002",
        "selection": "default"
      },
      "previewFingerprint": "77ced8d9ef9d666b9dc2da1e759a7595bbcdf852bcf8687737b89f63757b1bd1"
    },
    {
      "id": "e2e006-initial-reuse-s003-e59-auto-legacy-001-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-001",
        "stageId": "initial",
        "entityId": "e59"
      },
      "context": {
        "id": "e2e006-20261027-reused:s003/e59/auto/legacy-001/initial:v10:r104:o28670",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=10; sceneSession=s003:5; runId=104; firstCommandOrder=28670; originalAuditRunStartedOrder=28660; UI File/Open/Play/Reset at 2026-10-27T01:18:44.794Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "b75f441ddcbba9a41ec46cebc2df7ecc70e5ef6987f3cb9c8f4af8ce88b8e1ae",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=5; entry=s003/e59/auto/legacy-001/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=28670, runStartedOrder=28660; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s003-e59-auto-initial",
        "selection": "default"
      },
      "previewFingerprint": "6af05520964fbe8c8a06d8e17ac4c441177544b11980869f5cf3597556afc248"
    },
    {
      "id": "e2e006-initial-reuse-s003-e59-trigger-legacy-001-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "legacy-001",
        "stageId": "initial",
        "entityId": "e59"
      },
      "context": {
        "id": "e2e006-20261027-reused:s003/e59/trigger/legacy-001/initial:v10:r115:o29921",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=10; sceneSession=s003:5; runId=115; firstCommandOrder=29921; originalAuditRunStartedOrder=29918; UI File/Open/Play/Reset at 2026-10-27T01:18:53.295Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "70a83b2affbeb4675afe3f2e4936f118c4894a52fb08637521ab9c6b14b9181a",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=7; entry=s003/e59/trigger/legacy-001/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=29921, runStartedOrder=29918; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s003-e59-trigger-initial",
        "selection": "default"
      },
      "previewFingerprint": "ea1ce8af1e365ac09674d82da285303b7846e9ffa4212a1afeb250d2421fcd38"
    },
    {
      "id": "e2e006-initial-reuse-s003-e59-auto-legacy-002-routine",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-002",
        "stageId": "routine",
        "entityId": "e59"
      },
      "context": {
        "id": "e2e006-20261027-reused:s003/e59/auto/legacy-002/routine:v10:r119:o34645",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=10; sceneSession=s003:5; runId=119; firstCommandOrder=34645; originalAuditRunStartedOrder=29986; UI File/Open/Play/Reset at 2026-10-27T01:18:48.304Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "4ecb37cee0f8e42232a08d860a791d17d1f3dd9bf923b221a8db4fd72c8333b6",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=6; entry=s003/e59/auto/legacy-002/routine; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=34645, runStartedOrder=29986; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s003-e59-auto-legacy-002-routine",
        "selection": "default"
      },
      "previewFingerprint": "6839e0ca651817ee78e539556bb4bea4576162cc87c073e8618370297c710bb3"
    },
    {
      "id": "e2e006-initial-reuse-s005-e123-trigger-legacy-002-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "legacy-002",
        "stageId": "initial",
        "entityId": "e123"
      },
      "context": {
        "id": "e2e006-20261027-reused:s005/e123/trigger/legacy-002/initial:v14:r239:o67535",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=14; sceneSession=s005:7; runId=239; firstCommandOrder=67535; originalAuditRunStartedOrder=67534; UI File/Open/Play/Reset at 2026-10-27T01:19:26.057Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "4796638ff638f8c1a57fcb9f2c463a40ca7ba43cdb05a5088b5cb19873e4c06f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=11; entry=s005/e123/trigger/legacy-002/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=67535, runStartedOrder=67534; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s005-e123-trigger-initial",
        "selection": "default"
      },
      "previewFingerprint": "dc894ce49f33b30905dad88729c9db5d29f7577d2db5c26b2ed5ab15abe71cd5"
    },
    {
      "id": "e2e006-initial-reuse-s005-e116-trigger-legacy-001-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "legacy-001",
        "stageId": "initial",
        "entityId": "e116"
      },
      "context": {
        "id": "e2e006-20261027-reused:s005/e116/trigger/legacy-001/initial:v14:r242:o77945",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=14; sceneSession=s005:7; runId=242; firstCommandOrder=77945; originalAuditRunStartedOrder=77935; UI File/Open/Play/Reset at 2026-10-27T01:19:07.779Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "aa193848fcce790452a9413ddf99495f480a3a265686b78c5b60c8d6ed99e9fd",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=8; entry=s005/e116/trigger/legacy-001/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=77945, runStartedOrder=77935; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s005-e116-trigger-initial",
        "selection": "default"
      },
      "previewFingerprint": "6d466a23d51f4cec2ca9f74d0b125157d43b4e7d0c71b827577cbd791ce45aab"
    },
    {
      "id": "e2e006-initial-reuse-s005-e117-auto-legacy-001-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "legacy-001",
        "stageId": "initial",
        "entityId": "e117"
      },
      "context": {
        "id": "e2e006-20261027-reused:s005/e117/auto/legacy-001/initial:v14:r246:o79753",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=14; sceneSession=s005:7; runId=246; firstCommandOrder=79753; originalAuditRunStartedOrder=79511; UI File/Open/Play/Reset at 2026-10-27T01:19:18.090Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "evidence-collected",
      "sourceFingerprint": "6ba26e4ca6735763f67c0c026b0f4577bce40280628852d7de928cfe52c447d0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=10; entry=s005/e117/auto/legacy-001/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=79753, runStartedOrder=79511; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "原UI/技术接受及船体视觉判断完整保留，但旧audit取run-started；真正首命令前态有差异 [{\"entity\":\"e116\",\"field\":\"pos\",\"saved\":{\"col\":126,\"row\":52,\"height\":0},\"firstCommand\":{\"col\":126,\"row\":51.75,\"height\":0}},{\"entity\":\"e121\",\"field\":\"pos\",\"saved\":{\"col\":142,\"row\":79.25,\"height\":0},\"firstCommand\":{\"col\":142,\"row\":79.5,\"height\":0}}]。本事件仅evidence-collected，需核此时点的静态初态，不重开船体视觉。"
    },
    {
      "id": "e2e006-initial-reuse-s014-scene-onEnter-default-initial",
      "at": "2026-11-03T15:53:34.491Z",
      "actor": "Codex /root/e2e_baseline_docs (read-only evidence assembly)",
      "entry": {
        "sceneId": "s014",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "e2e006-20261027-reused:s014/onEnter/default/initial:v16:r251:o96395",
        "description": "历史独立接受的006静态预览现场；native=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; sceneVisit=16; sceneSession=s014:8; runId=251; firstCommandOrder=96395; originalAuditRunStartedOrder=96394; UI File/Open/Play/Reset at 2026-10-27T01:17:15.455Z; 不代表2026-11-04新run现场或新保存操作。"
      },
      "axis": "initialState",
      "from": "unreviewed",
      "to": "verified",
      "sourceFingerprint": "d96fc03f878c6c6c18f988a57f84678dd8c669be1a861423ef315d26003ca142",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-flow-preview.ts",
          "sha256": "8946fe2357f548940a9c39666b1b9124d80f5d288c0fef9a1fc83e5531f37a55"
        },
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/editor/src/ui/SceneInitialStateEditor.tsx",
          "sha256": "7688d7e7f045c1ab0e74a0f622e7615891b487a0ecd81f99f15cd8708e54a7ef"
        },
        {
          "path": "packages/editor/src/ui/SceneScriptWorkspace.tsx",
          "sha256": "732f7e9979d54eca92be502724f994372b5d76af7c8c7617ee140ca2f2629fab"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s014.json",
          "sha256": "39321aff31b831c7fa2a9387d6d3f4b88d492a1c118cf6ab7460189670cc3918"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        }
      ],
      "evidence": [
        {
          "path": "build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz",
          "sha256": "25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66",
          "selector": "member=delivery/preview-save-reopen/observations.json sha256=58499a9868f76424753dbe972e336c101c993f364911a76d7aef9ea3ecdd4ea8; index=0; entry=s014/onEnter/default/initial; before/running/after; original raw member=recording/build/e2e/reforge-006-2026-10-26T15-40-08-433Z/006-trace.json; firstCommandOrder=96395, runStartedOrder=96394; saved state member=delivery/script-preview-current.json sha256=2af49db116c1966bfa7a8c4876ca29fb3bbddd6b2f9ecae12d7ad0d8878ba642"
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "original archive=build/evidence-archive/e2e006-technical-20261027/technical-closeout.tar.gz SHA256=05d47c5fc6567282196ae6be0e00aadd282e55dd535595d8d668853f526e14d8; member=build/e2e-baseline-reconcile/retained006-verdicts/006-initial.json sha256=ea57fcabe9731183b6cc654ad3d01f7d160fa787cb893c09d52376f19c7c2400; acceptedBoundaries area=Preview static NPC projection; reviewer=Codex delegated technical reviewer /root/e2e006_technical_independent; member=build/e2e-baseline-reconcile/retained006-verdicts/006-C1.json sha256=af6358da320d74273c94bf4180901d3b21b0567dc9850c56a246c4e259f21140 preserves prior accepted scope"
        }
      ],
      "note": "承接逐地址旧静态NPC初态独立接受：原另存后File/Open、Play/Reset均有原始UI收据；保留10/11配置逐值不变，当前所属scene结构指纹与已接受dccd相等，四预览消费者字节相同；旧run-started与其真正首命令NPC投影相等。仅承接此历史context及静态显示范围，不授本轮Save、完整世界恢复、脚本审查或优化信用。",
      "reviewer": "Codex delegated technical reviewer /root/e2e006_technical_independent (2026-10-27 acceptance reused)",
      "preview": {
        "stateId": "e2e006-s014-scene-onEnter-initial",
        "selection": "default"
      },
      "previewFingerprint": "d7fc4686c0cf2f72a3a08f7dbc661e0d3a05b4c7c8b88eef17a4293e3ad86a0f"
    },
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v2-r2-o12-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s000",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v2:run2:command12",
        "description": "E2E 001; s000/scene/onEnter/default/initial; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=2; sceneSession=s000:1; runId=2; firstCommandOrder=12; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "eb3b36fa2c8c041ab8778f72ede2de9066a0624e67aafc8bb989f68d3593884c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=2, order=12, sceneVisit=2, first path=[\"initial\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s000\",\"slot\":\"onEnter\",\"hook\":\"default\",\"sceneSession\":\"s000:1\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v4-r5-o963-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v4:run5:command963",
        "description": "E2E 001; s001/scene/onEnter/default/initial; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=4; sceneSession=s001:2; runId=5; firstCommandOrder=963; path=[\"initial\",\"entry\",\"prepare\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "67d6016d72f02cee0f59e1bc21b02ac1ccbd1eb11ad9385a3604d80b184beb3e",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=5, order=963, sceneVisit=4, first path=[\"initial\",\"entry\",\"prepare\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s001\",\"slot\":\"onEnter\",\"hook\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e001-initial-reforge-001-2026-11-03T15-03-18-309Z-v4-r9-o6454-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "auto",
        "schemeId": "leave-bedroom",
        "stageId": "leave",
        "entityId": "e10"
      },
      "context": {
        "id": "reforge-001-2026-11-03T15-03-18-309Z:v4:run9:command6454",
        "description": "E2E 001; s001/e10/auto/leave-bedroom/leave; native build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; sceneVisit=4; sceneSession=s001:2; runId=9; firstCommandOrder=6454; path=[\"leave\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "3c46baaf6c1c77f582d2b70582acd8c03cce70fd492e8ac04f828fc597590d52",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-matrix-observer.mjs",
          "sha256": "aad2e5f0582e16a1f7c7b105de62989c8f09994f3767d70c27f081097a607d57"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/matrix.json; nativeSHA256=037c95dfec1e52f8bfc60fac0d2fd4429e729ce438dcaaf73db53e70c427c611; causes: phase=command, runId=9, order=6454, sceneVisit=4, first path=[\"leave\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e10\",\"channel\":\"auto\",\"behavior\":\"leave-bedroom\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-001-2026-11-03T15-03-18-309Z/report.json; nativeSHA256=2f10f27bed7f296bc90f82a9762b4400ab8da20d606ae73a2252f172d42125dc; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e001-s001-e10-auto-leave-bedroom-leave",
        "selection": "default"
      },
      "previewFingerprint": "5d3b7edd43640ec6e1b38f4142366c14a6582b0a3cb7b53813a122105ced66f7"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v4-r5-o528-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e3"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v4:run5:command528",
        "description": "E2E 002; s001/e3/trigger/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=4; sceneSession=s001:2; runId=5; firstCommandOrder=528; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "6be7083bb262ae9a5fd07048fc3995a64ec0b2fa4c8585c99132508cedb0c8a9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=5, order=528, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e3\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e002-s001-e3-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "c3e36995d15afe1602f3c000ddb8d845a14b5e5c6c7e3b646412cedd98a43e43"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r11-o1093-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e62"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run11:command1093",
        "description": "E2E 002; s003/e62/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=11; firstCommandOrder=1093; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "cac57d6ef6a774e1692111af0607b065e95e84f24b9adc89271e774eb6e67cef",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=11, order=1093, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e62\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r14-o1096-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e63"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run14:command1096",
        "description": "E2E 002; s003/e63/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=14; firstCommandOrder=1096; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "3f57efbe15271fd1d6faddb9bb23588cf0e8082c2530391662b37826e7f8c367",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=14, order=1096, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e63\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r17-o1097-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e64"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run17:command1097",
        "description": "E2E 002; s003/e64/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=17; firstCommandOrder=1097; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "352326cca14b4fb0be2a73413d409aca111d0c8711606aebcd1a220eebdaefa6",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=17, order=1097, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e64\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r20-o1098-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e75"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run20:command1098",
        "description": "E2E 002; s003/e75/auto/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=20; firstCommandOrder=1098; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "bad6032f8bedfb2a7087689445247651d8867c95a68fac74a51cbb3876009783",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=20, order=1098, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e75\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r22-o2590-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run22:command2590",
        "description": "E2E 002; s003/e56/trigger/default/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=22; firstCommandOrder=2590; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "69a3e31e7d147c6a74b74a5106cd7ef84f984c96c4f226e83099fcbfe3d4f934",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=22, order=2590, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r26-o6576-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-006",
        "stageId": "leave-reception",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run26:command6576",
        "description": "E2E 002; s003/e56/auto/legacy-006/leave-reception; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=26; firstCommandOrder=6576; path=[\"leave-reception\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "833c72d7a9e71f98cf3d80ec51f6be24aebd18549fae4174c39edc2bb0256350",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=26, order=6576, sceneVisit=6, first path=[\"leave-reception\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"auto\",\"behavior\":\"legacy-006\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e002-s003-e56-auto-legacy-006-leave-reception",
        "selection": "default"
      },
      "previewFingerprint": "fee5300261cc3322a22c5bf34e72c2bd5918ea929493e2c3670ebfeed48f9095"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r29-o7041-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "initial",
        "entityId": "e59"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run29:command7041",
        "description": "E2E 002; s003/e59/auto/legacy-003/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=29; firstCommandOrder=7041; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "b3f18163b206e870bc3ac9fbeb317895641e2d57010f721da518ffd1a5ed8223",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=29, order=7041, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e59\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e002-s003-e59-auto-legacy-003-initial",
        "selection": "default"
      },
      "previewFingerprint": "1bb20ce7dc70eb6462446b9bb29c7df8be996a6964ce4cee3fbcec1391528ea5"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r32-o7054-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "initial",
        "entityId": "e60"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run32:command7054",
        "description": "E2E 002; s003/e60/auto/legacy-003/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=32; firstCommandOrder=7054; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "04989caac0fb691965e5d0bac40a9150b7cef3c411bbd8acf74b3b5d06749aa3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=32, order=7054, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e60\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e002-s003-e59-auto-legacy-003-initial",
        "selection": "default"
      },
      "previewFingerprint": "1bb20ce7dc70eb6462446b9bb29c7df8be996a6964ce4cee3fbcec1391528ea5"
    },
    {
      "id": "e2e002-initial-reforge-002-2026-11-03T15-04-56-325Z-v6-r35-o7066-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "initial",
        "entityId": "e61"
      },
      "context": {
        "id": "reforge-002-2026-11-03T15-04-56-325Z:v6:run35:command7066",
        "description": "E2E 002; s003/e61/auto/legacy-003/initial; native build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; sceneVisit=6; sceneSession=s003:3; runId=35; firstCommandOrder=7066; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "28edb59edd7d9b2eb66031f2eaacc01097d294796318845029f8ebe2cce39ba0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-observer.mjs",
          "sha256": "34151d490e64013ce147fc415ea4478b6444350c0f14a63fef6073cbec5ec0f7"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/inn-trace.json; nativeSHA256=d9bcd5a2918556437e5af0ee81240dc432ab2ab014dff1c4e64c785ce299f3c6; causes: phase=command, runId=35, order=7066, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e61\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-002-2026-11-03T15-04-56-325Z/report.json; nativeSHA256=864d58ed51e0c9c0752292be6040458a1f60c106567c248e69d78d901af7a765; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e002-s003-e59-auto-legacy-003-initial",
        "selection": "default"
      },
      "previewFingerprint": "1bb20ce7dc70eb6462446b9bb29c7df8be996a6964ce4cee3fbcec1391528ea5"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r14-o927-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e47"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run14:command927",
        "description": "E2E 003; s003/e47/trigger/default/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=14; firstCommandOrder=927; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "a8fdf24a679ab1ab19af85d594f945f99e492a7b342f602b4b7c61f5e704caae",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=14, order=927, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e47\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s003-e47-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "52f7b1dd38f2567cf863cd3eadece39f31e601e9d490e139e54a9c156df20e95"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r17-o2626-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "greet-after-guests",
        "stageId": "initial",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run17:command2626",
        "description": "E2E 003; s003/e56/trigger/greet-after-guests/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=17; firstCommandOrder=2626; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "f630886915fc58fedcdfad540ba951f62b7319401f046ff0511145a368875685",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=17, order=2626, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"trigger\",\"behavior\":\"greet-after-guests\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s003-e47-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "52f7b1dd38f2567cf863cd3eadece39f31e601e9d490e139e54a9c156df20e95"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r21-o3191-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "auto",
        "schemeId": "go-to-kitchen",
        "stageId": "initial",
        "entityId": "e56"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run21:command3191",
        "description": "E2E 003; s003/e56/auto/go-to-kitchen/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=21; firstCommandOrder=3191; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "ef717f092d63820af4564e07f61af584c38ef49550200415ab6716b581613c7f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=21, order=3191, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e56\",\"channel\":\"auto\",\"behavior\":\"go-to-kitchen\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e003-s003-e56-auto-go-to-kitchen-initial",
        "selection": "default"
      },
      "previewFingerprint": "e5baf3164015fc8dddf072e77886655297c1b511d1ad3acad519bc994a5e63a2"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r23-o4649-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "beggar-first-talk",
        "stageId": "initial",
        "entityId": "e62"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run23:command4649",
        "description": "E2E 003; s003/e62/trigger/beggar-first-talk/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=23; firstCommandOrder=4649; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "91ec732ef646cf675bcc423b596c5d184c21af26b7f341695c8643c295bb99a3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=23, order=4649, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e62\",\"channel\":\"trigger\",\"behavior\":\"beggar-first-talk\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e003-s003-e62-trigger-beggar-first-talk-initial",
        "selection": "default"
      },
      "previewFingerprint": "ebb0b8ff82df6fbde29d9b424b4d07732db1a8d290a342190212b60b99e08ad6"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v4-r26-o7459-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e53"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v4:run26:command7459",
        "description": "E2E 003; s003/e53/trigger/default/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=4; sceneSession=s003:2; runId=26; firstCommandOrder=7459; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "aa3b315875831b8adea435741d94d3d496923f81f33d20f18863d2f320a34887",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=26, order=7459, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e53\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s003-e53-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "e63aa52fb68f16c9a9c74d583ee4331519661fa9cb0d20f606b9ea08c0532cef"
    },
    {
      "id": "e2e003-initial-reforge-003-2026-11-03T15-06-34-895Z-v6-r34-o9394-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "serve-guests",
        "stageId": "initial",
        "entityId": "e19"
      },
      "context": {
        "id": "reforge-003-2026-11-03T15-06-34-895Z:v6:run34:command9394",
        "description": "E2E 003; s001/e19/trigger/serve-guests/initial; native build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; sceneVisit=6; sceneSession=s001:3; runId=34; firstCommandOrder=9394; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "bd8410095874347fe2dfa41a043d111ace2bfca78d5a9b88982e8836b79f7dc0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-observer.mjs",
          "sha256": "583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/kitchen-trace.json; nativeSHA256=47ddca67e1abbdd7cd63dff214d23684b6b80d1517c919c7779e1230bce34924; causes: phase=command, runId=34, order=9394, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e19\",\"channel\":\"trigger\",\"behavior\":\"serve-guests\",\"sceneSession\":\"s001:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-003-2026-11-03T15-06-34-895Z/report.json; nativeSHA256=1b5558607c6c19bae6580935dd00f2065c0e8ef0fe2019d77da0a27e99cb1eb4; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "member=build/e2e-baseline-reconcile/preview-shared-name-correction.json; nativeSHA256=6359a8e4a3882327fb9cbaacadb0d6e8e7db7efe61fe340e03f0fceb502293e3; two names corrected after the frozen first rename; IDs, entity payloads and bindings unchanged"
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s001-e19-trigger-serve-guests-initial",
        "selection": "default"
      },
      "previewFingerprint": "209cea28433637d91bb088f2bb2e01c05795acfc19617b8157c0dae7d2ce2edc"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v4-r5-o541-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "take-dishes",
        "stageId": "initial",
        "entityId": "e20"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v4:run5:command541",
        "description": "E2E 004; s001/e20/trigger/take-dishes/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=4; sceneSession=s001:2; runId=5; firstCommandOrder=541; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "146bfae214b604636dc6773d61bd2e7e7fdb87db44bc0df25588e8125d10ad09",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=5, order=541, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e20\",\"channel\":\"trigger\",\"behavior\":\"take-dishes\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "member=build/e2e-baseline-reconcile/preview-shared-name-correction.json; nativeSHA256=6359a8e4a3882327fb9cbaacadb0d6e8e7db7efe61fe340e03f0fceb502293e3; two names corrected after the frozen first rename; IDs, entity payloads and bindings unchanged"
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e003-s001-e19-trigger-serve-guests-initial",
        "selection": "default"
      },
      "previewFingerprint": "209cea28433637d91bb088f2bb2e01c05795acfc19617b8157c0dae7d2ce2edc"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v4-r8-o1473-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e18"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v4:run8:command1473",
        "description": "E2E 004; s001/e18/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=4; sceneSession=s001:2; runId=8; firstCommandOrder=1473; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "a782161bb0cefbaaf62dd057afc73ca2b363ab02b2cb74358d8eaf5ad06929ec",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=8, order=1473, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e18\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "member=build/e2e-baseline-reconcile/preview-shared-name-correction.json; nativeSHA256=6359a8e4a3882327fb9cbaacadb0d6e8e7db7efe61fe340e03f0fceb502293e3; two names corrected after the frozen first rename; IDs, entity payloads and bindings unchanged"
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e004-s001-e18-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "3ccba283fefc388013e409293e26a149cec7dc26213990715156dead7481f1d7"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v6-r25-o3133-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e46"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v6:run25:command3133",
        "description": "E2E 004; s003/e46/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=6; sceneSession=s003:3; runId=25; firstCommandOrder=3133; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "26ac8722e913f93f432ce390511d19719eb0cc98a076e7b890413f8a3316c524",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=25, order=3133, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e46\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s003-e53-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "e63aa52fb68f16c9a9c74d583ee4331519661fa9cb0d20f606b9ea08c0532cef"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v6-r28-o4915-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e51"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v6:run28:command4915",
        "description": "E2E 004; s003/e51/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=6; sceneSession=s003:3; runId=28; firstCommandOrder=4915; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "6f13a536f14982ddca13d51579ebae26a213ea75f86dee77716fbcdb957c3b4d",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=28, order=4915, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e51\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s003-e53-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "e63aa52fb68f16c9a9c74d583ee4331519661fa9cb0d20f606b9ea08c0532cef"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v8-r36-o5697-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e15"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v8:run36:command5697",
        "description": "E2E 004; s001/e15/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=8; sceneSession=s001:4; runId=36; firstCommandOrder=5697; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "193706d73c885915b93f5fdfdcc3f1fb07f3e7d30cea7a0be06e9981ffcc2a93",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=36, order=5697, sceneVisit=8, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e15\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        },
        {
          "path": "docs/tasks/evidence/ED-ENTITY-STATE-PLAN-1-ui-20261104.tar.gz",
          "sha256": "7696ebad384fc34f6906f2721c5e4d62d3cfbbe62792f8c20f2194f1ea3f6596",
          "selector": "member=build/e2e-baseline-reconcile/preview-shared-name-correction.json; nativeSHA256=6359a8e4a3882327fb9cbaacadb0d6e8e7db7efe61fe340e03f0fceb502293e3; two names corrected after the frozen first rename; IDs, entity payloads and bindings unchanged"
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e004-s001-e18-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "3ccba283fefc388013e409293e26a149cec7dc26213990715156dead7481f1d7"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v8-r40-o8348-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "auto",
        "schemeId": "legacy-003",
        "stageId": "routine",
        "entityId": "e26"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v8:run40:command8348",
        "description": "E2E 004; s001/e26/auto/legacy-003/routine; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=8; sceneSession=s001:4; runId=40; firstCommandOrder=8348; path=[\"routine\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "784218f5a63949b4033ed2ee60358862327a2e1714dac698bbcd0fffdc6ca98d",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=40, order=8348, sceneVisit=8, first path=[\"routine\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e26\",\"channel\":\"auto\",\"behavior\":\"legacy-003\",\"sceneSession\":\"s001:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e004-s001-e26-auto-legacy-003-routine",
        "selection": "default"
      },
      "previewFingerprint": "776b2f1d1efe66ca6ed15995c9c2a8dce0f122178dcae1a37406a28f4dc39c23"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v8-r42-o9284-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e12"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v8:run42:command9284",
        "description": "E2E 004; s001/e12/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=8; sceneSession=s001:4; runId=42; firstCommandOrder=9284; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "2b6d9f595b88d1d9f5b5bb621f9335c21a1889834b8690e59e68110fc0703623",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=42, order=9284, sceneVisit=8, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e12\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e004-s001-e12-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "31ebe7b42c7025e94ab027f33caaef660f43330dde17e1c5958f568cdad1f29a"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v10-r59-o10948-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e47"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v10:run59:command10948",
        "description": "E2E 004; s003/e47/trigger/default/initial; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=10; sceneSession=s003:5; runId=59; firstCommandOrder=10948; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "a8fdf24a679ab1ab19af85d594f945f99e492a7b342f602b4b7c61f5e704caae",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=59, order=10948, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e47\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。这是已落盘的替代现场状态，须手动选择；未改变该步骤现有默认绑定。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e003-s003-e53-trigger-default-initial",
        "selection": "manual"
      },
      "previewFingerprint": "90aa01524ac70386cf6bf27c9313236f771fdb31258f579ecae41d1d19b39e96"
    },
    {
      "id": "e2e004-initial-reforge-004-story-2026-11-03T15-07-47-754Z-v10-r65-o13425-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "c8-321c0a7d7de1",
        "stageId": "stage-1",
        "entityId": "e62"
      },
      "context": {
        "id": "reforge-004-story-2026-11-03T15-07-47-754Z:v10:run65:command13425",
        "description": "E2E 004; s003/e62/trigger/c8-321c0a7d7de1/stage-1; native build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; sceneVisit=10; sceneSession=s003:5; runId=65; firstCommandOrder=13425; path=[\"stage-1\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "0c65a3b5bf291c4613045c2ec1887e7e5c098689ae5fe5752541eb02ffffb341",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-observer.mjs",
          "sha256": "78cb8d9b5de278ab89b4f5587efdb16804dd84af73c4d379626a19e950f45f63"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/004-story.trace.json; nativeSHA256=babd93f352fbf832766221e591eb66819a71f92dd1034651b388f5e1b23726f8; causes: phase=command, runId=65, order=13425, sceneVisit=10, first path=[\"stage-1\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e62\",\"channel\":\"trigger\",\"behavior\":\"c8-321c0a7d7de1\",\"sceneSession\":\"s003:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-004-story-2026-11-03T15-07-47-754Z/report.json; nativeSHA256=670dbb4c88c1c710feba617be315f8ae987fca860121934e3a64e24cf160f7fb; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e003-s003-e53-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "e63aa52fb68f16c9a9c74d583ee4331519661fa9cb0d20f606b9ea08c0532cef"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v4-r11-o1123-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e53"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v4:run11:command1123",
        "description": "E2E 005; s003/e53/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=4; sceneSession=s003:2; runId=11; firstCommandOrder=1123; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "aa3b315875831b8adea435741d94d3d496923f81f33d20f18863d2f320a34887",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=11, order=1123, sceneVisit=4, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e53\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:2\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。这是已落盘的替代现场状态，须手动选择；未改变该步骤现有默认绑定。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s003-e53-trigger-default-initial",
        "selection": "manual"
      },
      "previewFingerprint": "04463d27baeaef39473ae03abe34816e1a379e637fe9fb630351a8f182a33c5c"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v6-r19-o2708-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "c8-74bc98f07f8e",
        "stageId": "stage-1",
        "entityId": "e19"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v6:run19:command2708",
        "description": "E2E 005; s001/e19/trigger/c8-74bc98f07f8e/stage-1; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=6; sceneSession=s001:3; runId=19; firstCommandOrder=2708; path=[\"stage-1\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "c185f4741152e43b04c9ccb9fd40ee39a5f06c3512142ea4a1251485e542c9ca",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=19, order=2708, sceneVisit=6, first path=[\"stage-1\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e19\",\"channel\":\"trigger\",\"behavior\":\"c8-74bc98f07f8e\",\"sceneSession\":\"s001:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s001-e19-trigger-c8-74bc98f07f8e-stage-1",
        "selection": "default"
      },
      "previewFingerprint": "fa0a8ba6b99df323122a54d3a89672585d7ca96536cf781518c987d9ac61e6c1"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v6-r22-o4629-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s001",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e18"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v6:run22:command4629",
        "description": "E2E 005; s001/e18/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=6; sceneSession=s001:3; runId=22; firstCommandOrder=4629; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "a782161bb0cefbaaf62dd057afc73ca2b363ab02b2cb74358d8eaf5ad06929ec",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=22, order=4629, sceneVisit=6, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s001\",\"entity\":\"e18\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s001:3\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。这是已落盘的替代现场状态，须手动选择；未改变该步骤现有默认绑定。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s001-e19-trigger-c8-74bc98f07f8e-stage-1",
        "selection": "manual"
      },
      "previewFingerprint": "26342721a8429644bad06f605c4963460fb9295dc191e1979a5c8d2a73d78248"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v8-r36-o6276-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s003",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e44"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v8:run36:command6276",
        "description": "E2E 005; s003/e44/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=8; sceneSession=s003:4; runId=36; firstCommandOrder=6276; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "c939c5ebd9f925b923f5cd3d5b213b7005296c3ad83a504671f7874ab5ca8fa1",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=36, order=6276, sceneVisit=8, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s003\",\"entity\":\"e44\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s003:4\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s003-e53-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "08c88090fadf54f78c68aeadab26e8fe405541e3f2a1781f7e253b3a9a925ebc"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r42-o7099-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e76"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run42:command7099",
        "description": "E2E 005; s004/e76/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=42; firstCommandOrder=7099; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "f45d2820953f4a410d0f39be43e2ec2bb99d2ec768d24348348cad68dfbdc04c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=42, order=7099, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e76\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r45-o7100-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e77"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run45:command7100",
        "description": "E2E 005; s004/e77/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=45; firstCommandOrder=7100; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "99ee6fc8b2f693c618dbda368706dd8a4330983db0ad9b7843cdaa100d4bb458",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=45, order=7100, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e77\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r48-o7101-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e82"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run48:command7101",
        "description": "E2E 005; s004/e82/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=48; firstCommandOrder=7101; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "35a48ca4cbffff268c6b91e038fe50398ea19b8a0671646f6fae046ab8f9532f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=48, order=7101, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e82\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r51-o7102-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e83"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run51:command7102",
        "description": "E2E 005; s004/e83/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=51; firstCommandOrder=7102; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "2e54be6c7038ccec38645a311434aeb48c7982e0650f921583a8e0e7a33eb4d9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=51, order=7102, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e83\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r54-o7103-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e84"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run54:command7103",
        "description": "E2E 005; s004/e84/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=54; firstCommandOrder=7103; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "f462cfcd8efd8e01347362dc3ed0b9c0f377dcd21036d1cf3f23f8cdd393a682",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=54, order=7103, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e84\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r57-o7104-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e85"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run57:command7104",
        "description": "E2E 005; s004/e85/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=57; firstCommandOrder=7104; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "902c467391d31baaeeb81a30fcb914c025f2eed389b0201568893daa7a7cf1e5",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=57, order=7104, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e85\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r60-o7105-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e86"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run60:command7105",
        "description": "E2E 005; s004/e86/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=60; firstCommandOrder=7105; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "b4709da61840f69f973a3bf214c4e30c3bc816a53120c7f90061e89afda1a42c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=60, order=7105, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e86\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r63-o7106-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e87"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run63:command7106",
        "description": "E2E 005; s004/e87/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=63; firstCommandOrder=7106; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "1da0d8397f5870934ee07a5ea83135a2a7caa8a36d52c1f60f9205eff24bf21f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=63, order=7106, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e87\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r66-o7107-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e89"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run66:command7107",
        "description": "E2E 005; s004/e89/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=66; firstCommandOrder=7107; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "59d6aaf0359cbbf27f531d890e38d40fb1779247b6de98f6e71ec7e27a5c1287",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=66, order=7107, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e89\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r69-o7108-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e90"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run69:command7108",
        "description": "E2E 005; s004/e90/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=69; firstCommandOrder=7108; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "73e40c302b60ef080af0b62a44da6b901798c0bcf216fec745c33fbc8061b5dd",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=69, order=7108, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e90\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r72-o7109-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e91"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run72:command7109",
        "description": "E2E 005; s004/e91/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=72; firstCommandOrder=7109; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "ba3a122e25f09fc7916e857e837e51f68ab4250f27d19d5ab3a70c7bae531df8",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=72, order=7109, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e91\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r75-o7110-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e92"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run75:command7110",
        "description": "E2E 005; s004/e92/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=75; firstCommandOrder=7110; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "006cba0095d6f628fcc184c78350cdd07b9b8b14eae60b0429478b5d27609b5b",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=75, order=7110, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e92\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r78-o7111-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "patrol",
        "entityId": "e93"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run78:command7111",
        "description": "E2E 005; s004/e93/auto/default/patrol; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=78; firstCommandOrder=7111; path=[\"patrol\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "3dbb1cee172b5656a1a8fc650769e319e728c2092d530a289ce9cbfdf2320ad1",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=78, order=7111, sceneVisit=10, first path=[\"patrol\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e93\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r81-o7112-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e101"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run81:command7112",
        "description": "E2E 005; s004/e101/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=81; firstCommandOrder=7112; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "352367e60a1908ac20a50d3f9d0c10f22e24db9c5e0d45049f05380fdf8b617b",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=81, order=7112, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e101\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r84-o7113-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e102"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run84:command7113",
        "description": "E2E 005; s004/e102/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=84; firstCommandOrder=7113; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "b57b5a957d038d1151d52b75fb1dca474cb60ba76580cc12389120f6627b1ae7",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=84, order=7113, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e102\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r87-o7114-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e103"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run87:command7114",
        "description": "E2E 005; s004/e103/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=87; firstCommandOrder=7114; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "15e1fc32b9a62654c4c64a7adcd575d5b7e09a618c3806cfbdc311aa2f1f62b8",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=87, order=7114, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e103\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r90-o7115-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e104"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run90:command7115",
        "description": "E2E 005; s004/e104/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=90; firstCommandOrder=7115; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "0ca0193a33894f8f3c240ea6dc3f52d906737d1708672e3aa0785a5abadd998c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=90, order=7115, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e104\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r93-o7116-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e112"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run93:command7116",
        "description": "E2E 005; s004/e112/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=93; firstCommandOrder=7116; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "6e2e3c09870242c2ad0b243142d06195d7433bab287f95ba479e4b647296092c",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=93, order=7116, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e112\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r96-o7117-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e114"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run96:command7117",
        "description": "E2E 005; s004/e114/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=96; firstCommandOrder=7117; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "f812b430e6a5085bea0a52abe9c1c0e017b1f491bbdf728b3f792735b228b9c3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=96, order=7117, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e114\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r98-o7188-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "onEnter",
        "schemeId": "default",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run98:command7188",
        "description": "E2E 005; s004/scene/onEnter/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=98; firstCommandOrder=7188; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "87b9bee4cce57c7de79a6603a68deed9b688bef4ed086ff995a98a0a53237a6f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=98, order=7188, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s004\",\"slot\":\"onEnter\",\"hook\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v10-r101-o23423-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e95"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v10:run101:command23423",
        "description": "E2E 005; s004/e95/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=10; sceneSession=s004:5; runId=101; firstCommandOrder=23423; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "45483c07deba1ef9feac4b5f4d6447b38db27e0fe689ece0c74eca2e21289df5",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=101, order=23423, sceneVisit=10, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e95\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s004:5\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s004-e95-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "35d3591caeb59e7c79c041d1c5fb43e14192f2894b4c3c221b2b756fc7cf270d"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r107-o25899-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "patrol",
        "entityId": "e121"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run107:command25899",
        "description": "E2E 005; s005/e121/auto/default/patrol; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=107; firstCommandOrder=25899; path=[\"patrol\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "b671976953dc9030e42b5c6c8849ec129664fe44ba7cc7dc4bd768f56e1a10ce",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=107, order=25899, sceneVisit=12, first path=[\"patrol\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e121\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r110-o25900-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "patrol",
        "entityId": "e122"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run110:command25900",
        "description": "E2E 005; s005/e122/auto/default/patrol; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=110; firstCommandOrder=25900; path=[\"patrol\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "44b724f7ea2b415f73a0e6f252d4c502410c5daa40a958d4d2aad8656cd91af9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=110, order=25900, sceneVisit=12, first path=[\"patrol\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e122\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r113-o25901-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e127"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run113:command25901",
        "description": "E2E 005; s005/e127/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=113; firstCommandOrder=25901; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "22da6ff28148aff39e30d7ca69a525c1168d5e62396e8e722ed4f1aa4c128865",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=113, order=25901, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e127\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r116-o25902-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e128"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run116:command25902",
        "description": "E2E 005; s005/e128/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=116; firstCommandOrder=25902; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "f7e207a1173afb7c93fc33c7f161904f5ab09161a36ff444a22565b917ebd45a",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=116, order=25902, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e128\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r119-o25903-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e129"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run119:command25903",
        "description": "E2E 005; s005/e129/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=119; firstCommandOrder=25903; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "13171973fb8de8e0097be7bf8b3465118e43bde7cb81666222b5fffde2d75b62",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=119, order=25903, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e129\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r122-o25904-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e130"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run122:command25904",
        "description": "E2E 005; s005/e130/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=122; firstCommandOrder=25904; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "cad156412b980a462aa6490289444bc3f40ba04bb23cd7d748761b7717390cf3",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=122, order=25904, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e130\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r125-o25905-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e131"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run125:command25905",
        "description": "E2E 005; s005/e131/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=125; firstCommandOrder=25905; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "49e3b54271598642a1a7a92b0129cc3f1ae76f0e1bdaf815413b0d287260fd69",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=125, order=25905, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e131\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r128-o25906-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e132"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run128:command25906",
        "description": "E2E 005; s005/e132/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=128; firstCommandOrder=25906; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "1b696a1f36a9e71b2d8cc19da012cff6dfa384628799a4844618283711ee5938",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=128, order=25906, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e132\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r131-o25907-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e133"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run131:command25907",
        "description": "E2E 005; s005/e133/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=131; firstCommandOrder=25907; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "d5917d7a8dff530c9fb6c794a3103f79e25cf746131566a98ff0f47723065662",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=131, order=25907, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e133\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r134-o25908-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e134"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run134:command25908",
        "description": "E2E 005; s005/e134/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=134; firstCommandOrder=25908; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "18279ed85e94e511a07e69e830fbc178fea9ee622da6e6d2970c614681d128db",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=134, order=25908, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e134\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r137-o25909-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e135"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run137:command25909",
        "description": "E2E 005; s005/e135/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=137; firstCommandOrder=25909; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "5d497e8fd76b8e836aa114a6fa2788c4c7a667747c0cf0b8ddc2739074aa1d2f",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=137, order=25909, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e135\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r140-o25910-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e137"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run140:command25910",
        "description": "E2E 005; s005/e137/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=140; firstCommandOrder=25910; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "ac8145076f93fe88a63a4a7ea3d3c859394ecf1e21f93a7d17ff7b9d9d92d557",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=140, order=25910, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e137\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r143-o25911-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "auto",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e138"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run143:command25911",
        "description": "E2E 005; s005/e138/auto/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=143; firstCommandOrder=25911; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "90378680a6f186ab92815e2576b79059831fa3a5a0ac6448f6472a07e0846117",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=143, order=25911, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e138\",\"channel\":\"auto\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": null,
        "selection": "default"
      },
      "previewFingerprint": "683929c1a8d41952e9550b55914b3fa889b2ed0052c3edeb521c257c2b5541a3"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r145-o33759-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e127"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run145:command33759",
        "description": "E2E 005; s005/e127/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=145; firstCommandOrder=33759; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "75fe50b6624f1542dbca17817c12c81bdb4523c7f9cff107dc0bf9d33aec87d4",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=145, order=33759, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e127\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s005-e127-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "181bc6e861fac17adcb0ff85125d57c2875308fe682244bf369c3388aa442ba7"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r148-o40398-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e124"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run148:command40398",
        "description": "E2E 005; s005/e124/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=148; firstCommandOrder=40398; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "04ceec89cf13fed9ae78fc1d4d411541a0a47fde1b52f20505ced39f304b2900",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=148, order=40398, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e124\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s005-e124-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "2a0f2013b6cade93f73d178b81a5ee548aad1373347be03fd440f26035273942"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r151-o48752-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "legacy-001",
        "stageId": "initial",
        "entityId": "e123"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run151:command48752",
        "description": "E2E 005; s005/e123/trigger/legacy-001/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=151; firstCommandOrder=48752; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "168be88408611023c27bdbfde542cb1ce96b2dd0e07d5592245d04fb441ac550",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=151, order=48752, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e123\",\"channel\":\"trigger\",\"behavior\":\"legacy-001\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s005-e123-trigger-legacy-001-initial",
        "selection": "default"
      },
      "previewFingerprint": "9bfe8b0bc21fafe676dfcd55b889a89da942ba00769983192202963e1ced7c17"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v12-r154-o63741-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s005",
        "channel": "trigger",
        "schemeId": "default",
        "stageId": "initial",
        "entityId": "e115"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v12:run154:command63741",
        "description": "E2E 005; s005/e115/trigger/default/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=12; sceneSession=s005:6; runId=154; firstCommandOrder=63741; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "f43c4b601e185cccf8a436144392fc29893d9293b076da6b86769235e3bf85a9",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=154, order=63741, sceneVisit=12, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s005\",\"entity\":\"e115\",\"channel\":\"trigger\",\"behavior\":\"default\",\"sceneSession\":\"s005:6\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s005-e115-trigger-default-initial",
        "selection": "default"
      },
      "previewFingerprint": "7446fda128c5062b1532c6867619014523a85eff181d542ba2d2feff9418c3ae"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r216-o65660-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "onEnter",
        "schemeId": "legacy-003",
        "stageId": "initial"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run216:command65660",
        "description": "E2E 005; s004/scene/onEnter/legacy-003/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=216; firstCommandOrder=65660; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "3feb51a7795612ad057b57dd1126575942c8235b25c4a446281db0acde8622a8",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=216, order=65660, sceneVisit=14, first path=[\"initial\",0]; author={\"kind\":\"scene-hook\",\"scene\":\"s004\",\"slot\":\"onEnter\",\"hook\":\"legacy-003\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s004-scene-onEnter-legacy-003-initial",
        "selection": "default"
      },
      "previewFingerprint": "efb984b8b16848f2b20c4d4eb026e47a783024f667ee0a61b649167fc3faaea7"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r219-o65702-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "trigger",
        "schemeId": "report-aunt-illness",
        "stageId": "report",
        "entityId": "e83"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run219:command65702",
        "description": "E2E 005; s004/e83/trigger/report-aunt-illness/report; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=219; firstCommandOrder=65702; path=[\"report\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "c2daadba056dc75c96632d14cdc1eb2e981ec82c25ec57636d9e6ffb3d436eb0",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s002.json",
          "sha256": "3a7fd2b765f0f6b73d62aa594ed4f9961e04e1a6d43e656b1758aaefd9078ed4"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/scenes/s010.json",
          "sha256": "b505cd441b738bdcbce2e2478da7ed4243e2a5632986aa336cd88eadd3153dbf"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=219, order=65702, sceneVisit=14, first path=[\"report\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e83\",\"channel\":\"trigger\",\"behavior\":\"report-aunt-illness\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。跨场景操作仍需另核完整现场，当前仅本场景静态布置。",
      "preview": {
        "stateId": "e2e005-s004-scene-onEnter-legacy-003-initial",
        "selection": "default"
      },
      "previewFingerprint": "efb984b8b16848f2b20c4d4eb026e47a783024f667ee0a61b649167fc3faaea7"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r222-o72017-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "legacy-001",
        "stageId": "routine",
        "entityId": "e88"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run222:command72017",
        "description": "E2E 005; s004/e88/auto/legacy-001/routine; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=222; firstCommandOrder=72017; path=[\"routine\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "287d89e94c537892c9a934100a3a4eedfe055ee411847a0d978aa7f9ac877148",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=222, order=72017, sceneVisit=14, first path=[\"routine\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e88\",\"channel\":\"auto\",\"behavior\":\"legacy-001\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s004-e88-auto-legacy-001-routine",
        "selection": "default"
      },
      "previewFingerprint": "fbffa47ea92a889adfe3eddf0e28718b2e5f8a149f168c48fb602f7d31cb40eb"
    },
    {
      "id": "e2e005-initial-reforge-005-story-2026-11-03T15-11-09-507Z-v14-r225-o72752-persisted",
      "at": "2026-11-03T16:05:37.779Z",
      "actor": "Codex /root",
      "entry": {
        "sceneId": "s004",
        "channel": "auto",
        "schemeId": "legacy-002",
        "stageId": "initial",
        "entityId": "e83"
      },
      "context": {
        "id": "reforge-005-story-2026-11-03T15-11-09-507Z:v14:run225:command72752",
        "description": "E2E 005; s004/e83/auto/legacy-002/initial; native build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; sceneVisit=14; sceneSession=s004:7; runId=225; firstCommandOrder=72752; path=[\"initial\",0]; resumeAtRunStart=null."
      },
      "axis": "initialState",
      "from": "evidence-collected",
      "to": "saved",
      "sourceFingerprint": "b6a74216bca67f1837da4bcf6c4359883a8d20b3e4239479e532ef35f55f0c0a",
      "dependencies": [
        {
          "path": "packages/editor/src/core/script-preview-library.ts",
          "sha256": "0861a2a12b56bb30681963c934c094e4e2e0ea661fa732afd933a7f04b2c2b07"
        },
        {
          "path": "packages/reforge/src/entity-lifecycle.ts",
          "sha256": "cd3c4742b664371e6f8b9e660cc53af0a9b8f17281b40f482b636699346653c9"
        },
        {
          "path": "packages/reforge/src/main.ts",
          "sha256": "f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"
        },
        {
          "path": "packages/reforge/src/project-loader.ts",
          "sha256": "ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f"
        },
        {
          "path": "packages/reforge/src/runtime-script-project.ts",
          "sha256": "188f11c7e6102c00cef86271e723fc84e064b4ef921e7660f87602fc79f0b8ad"
        },
        {
          "path": "packages/reforge/src/script-project-core.ts",
          "sha256": "84d012f2f891bb2a5188c6e13def89460397abf4a8973fdbbf28b4a696adc2f5"
        },
        {
          "path": "packages/reforge/src/script-runner-core.ts",
          "sha256": "885ddfef0a74e8a70ed51cb345979f640bec8df4f46c32d5e891e6d34ee2aef5"
        },
        {
          "path": "projects/pal/content/actors.json",
          "sha256": "70391b6323bc5e983519532dece143cb1a392726460a5593a9890b6c499999b0"
        },
        {
          "path": "projects/pal/content/items.json",
          "sha256": "169aea997e38278426095db6a55c9ad74c6b9b2b7c7348f9d08d846a31e4bddc"
        },
        {
          "path": "projects/pal/content/scenes/s000.json",
          "sha256": "9ff5e3c9b287d777f206c76beeb8e1a3900fd7716178721b58fcacfa2904636b"
        },
        {
          "path": "projects/pal/content/scenes/s001.json",
          "sha256": "6eb9f01657d9d855697ddd5b8dcb2ab396d15caac40242f02ae520a950396db5"
        },
        {
          "path": "projects/pal/content/scenes/s003.json",
          "sha256": "8987e8d86fc645bacf15e8311fb105628c2a48301acf598a148708a37ecefa96"
        },
        {
          "path": "projects/pal/content/scenes/s004.json",
          "sha256": "37d79a8682cac8e80856c454882d95425d517b7287c0cb14754cf7979a060146"
        },
        {
          "path": "projects/pal/content/scenes/s005.json",
          "sha256": "bcc0614d562f87eda44ed4618997e17da64274de14ab24a57d23bec8d52114ec"
        },
        {
          "path": "projects/pal/content/sprites.json",
          "sha256": "7acbf896deef1d65b2c6ef0460fd40910138d2818c47b03a1a901887462a7e1a"
        },
        {
          "path": "scripts/e2e/errand-observer.mjs",
          "sha256": "803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"
        },
        {
          "path": "scripts/e2e/errand-trace-plugin.mjs",
          "sha256": "3dd53e2f70215be39106af6413e3bd9d7bc9d2beee378957d9fbdd64e5ff50d6"
        },
        {
          "path": "scripts/e2e/inn-trace-plugin.mjs",
          "sha256": "4a87faa3970d8f951fe0a51e2a8e78801778dab076b6cb1b856e8443985037f3"
        },
        {
          "path": "scripts/e2e/kitchen-trace-plugin.mjs",
          "sha256": "4d499e139d83fe286d1077831a1d4e554ef5f7bf183406af8ad70370212188a7"
        },
        {
          "path": "scripts/e2e/meal-trace-plugin.mjs",
          "sha256": "1a60ccb3fa3f36dd08365acfb42eb79f08550d2ef2136471c4f954b0885ebdeb"
        },
        {
          "path": "scripts/e2e/opening-causal-instrumentation.mjs",
          "sha256": "85b424da5bf371e09349731fcccd57f7f32cf5d1bbd40ac42caa46176bbb02f6"
        },
        {
          "path": "scripts/e2e/opening-trace-plugin.mjs",
          "sha256": "f4ade1bd454b3dbde7474b8602227656bbf9d8d44090d3ed828710eb9a603db2"
        },
        {
          "path": "scripts/e2e/reforge-actor-observation.mjs",
          "sha256": "0ba1f9a1029d341d9cd4ebba0231eed57ca906f47aec09d124b0a9feff0859be"
        },
        {
          "path": "scripts/e2e/script-causal-observer.mjs",
          "sha256": "d17bed577dea925aaf14d65111cda67e9b73461490e8501a1a97bf649e93f724"
        }
      ],
      "evidence": [
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/005-latest.trace.json; nativeSHA256=87e726672b07835b89d1f13c77dd7db03cd5d64d7648ccaa230c8eebd0a8c38d; causes: phase=command, runId=225, order=72752, sceneVisit=14, first path=[\"initial\",0]; author={\"kind\":\"entity-behavior\",\"scene\":\"s004\",\"entity\":\"e83\",\"channel\":\"auto\",\"behavior\":\"legacy-002\",\"sceneSession\":\"s004:7\"}; resume=null; read poses/world before command"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e/reforge-005-story-2026-11-03T15-11-09-507Z/report.json; nativeSHA256=41e04208b68b841c1326501277cf7f2314293163c6868e144beae3cc6ad1df0d; status; revision; hashes; storyScope; sourceHashesStable when present"
        },
        {
          "path": "docs/tasks/evidence/E2E-R4-1-preview-baseline-20261104.tar.gz",
          "sha256": "e39424ff1e6d45d2540c59a28e7158bbfedfd75edbe38d36e04f2fe7fcec5ba2",
          "selector": "member=build/e2e-baseline-reconcile/editor-save-failure-20261104/ordinary-save-success.json; operation bd8ac5e3-ba17-4f84-9baf-7d3e97509bd4 committed; member=derived/script-preview-after-human-names.json; root name-only follow-up changes do not alter IDs/entity properties/bindings."
        }
      ],
      "note": "真实现场投影已配置并持久化；32套/42绑定由编辑器绑定工程保存成功，随后按用户反馈仅修用途名称。当前默认状态或场景默认与本现场候选匹配。仅记录静态属性与关联已落盘；名称后续修订不授新的UI保存信用。逐入口切回、保存后重开和Play/Reset未完成，review/optimization不提升；首次Safe Browsing失败原件保留。",
      "preview": {
        "stateId": "e2e005-s004-e83-auto-legacy-002-initial",
        "selection": "default"
      },
      "previewFingerprint": "4e3b1c5c4f62ff71a38f4ce688b775d0d05f73be65fa37d08595e4ef4e540372"
    }
  ]
}
```

## 阻塞与决策

未核入口、缺失原件、版本漂移或尚未完成的编辑器操作保持各自未完成状态。工具只验证身份、
线性记录和已声明的字节边界，依赖完整性与证据语义由独立核验者裁定。删除或改写旧事件不可接受；
确有旧判断错误时追加纠正事件，并保留其原范围。新增或删除canonical步骤须核稳定身份与去向。

## 下一步

Codex先补录001–006实际完成与待办的逐入口事件，按场景/NPC筛选继续配置和复验；后续每次E2E
或优化同步追加事实。完成标准是相应context的三个轴各有充分、可恢复证据及必要独立验收；
`--check`成功只表示记录自洽和所声明版本匹配，不代表全量脚本已经完成。
