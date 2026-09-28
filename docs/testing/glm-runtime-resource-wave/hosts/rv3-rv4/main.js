var __rv2Glob = () => () => ({});
(() => {
  // packages/content/src/actor-condition.ts
  var CARRIED_STATUS_TURN_RANGE = { min: 1, max: 999 };
  var ACTOR_STATUS_DEFINITIONS = {
    confused: {
      label: "\u6DF7\u4E71",
      category: "bad",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u65E0\u6CD5\u6B63\u5E38\u63A7\u5236\uFF0C\u53EF\u80FD\u653B\u51FB\u961F\u53CB\u3002"
    },
    paralyzed: {
      label: "\u5B9A\u8EAB",
      category: "bad",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u65E0\u6CD5\u884C\u52A8\u3002"
    },
    sleep: {
      label: "\u7761\u7720",
      category: "bad",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u65E0\u6CD5\u884C\u52A8\u3002"
    },
    silence: {
      label: "\u6C89\u9ED8",
      category: "bad",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u65E0\u6CD5\u65BD\u653E\u4ED9\u672F\u3002"
    },
    puppet: {
      label: "\u5080\u5121",
      category: "dead-only",
      carryable: false,
      turnRange: null,
      description: "\u53EA\u80FD\u65BD\u52A0\u7ED9\u5DF2\u5012\u4E0B\u7684\u961F\u5458\uFF0C\u4E0D\u80FD\u4F5C\u4E3A\u5927\u4E16\u754C\u643A\u5E26\u72B6\u6001\u3002"
    },
    bravery: {
      label: "\u795E\u52C7",
      category: "good",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u63D0\u9AD8\u653B\u51FB\u8868\u73B0\u3002"
    },
    protect: {
      label: "\u62A4\u4F53",
      category: "good",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u53D7\u5230\u7684\u7269\u7406\u4E0E\u6CD5\u672F\u4F24\u5BB3\u51CF\u534A\u3002"
    },
    haste: {
      label: "\u52A0\u901F",
      category: "good",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u63D0\u9AD8\u884C\u52A8\u901F\u5EA6\u3002"
    },
    dualAttack: {
      label: "\u8FDE\u51FB",
      category: "good",
      carryable: true,
      turnRange: CARRIED_STATUS_TURN_RANGE,
      description: "\u666E\u901A\u653B\u51FB\u53EF\u8FDE\u7EED\u51FA\u624B\u3002"
    }
  };
  var CARRYABLE_STATUS_IDS = Object.entries(ACTOR_STATUS_DEFINITIONS).filter(([, definition]) => definition.carryable).map(([status]) => status);
  var CARRYABLE_STATUS_ID_SET = new Set(CARRYABLE_STATUS_IDS);

  // packages/content/src/actor-reference.ts
  var ACTOR_REFERENCE_POLICIES = Object.freeze({
    "scene-entity-actor": {
      label: "\u573A\u666F\u4EBA\u7269\u5B9E\u4F8B",
      ownership: "external",
      danglingSeverity: "error"
    },
    "entry-point-party": {
      label: "\u5165\u53E3\u5F00\u5C40\u961F\u4F0D",
      ownership: "external",
      danglingSeverity: "error"
    },
    // seedStats 既是 Actor 引用，也是开局存档种子；保留既有保存前硬错误语义。
    "entry-point-seed-stats": {
      label: "\u5165\u53E3\u5C5E\u6027\u64AD\u79CD",
      ownership: "external",
      danglingSeverity: "error"
    },
    "entry-point-seed-condition": {
      label: "\u5165\u53E3\u5F53\u524D\u72B6\u6001",
      ownership: "external",
      danglingSeverity: "error"
    },
    "condition-in-party": {
      label: "\u811A\u672C\u5728\u961F\u6761\u4EF6",
      ownership: "external",
      danglingSeverity: "error"
    },
    "enemy-condition-player-in-party": {
      label: "\u654C\u4EBA\u73A9\u5BB6\u5728\u961F\u6761\u4EF6",
      ownership: "external",
      danglingSeverity: "error"
    },
    "actor-covered-by": { label: "\u4EBA\u7269\u63F4\u62A4\u5173\u7CFB", ownership: "external", danglingSeverity: "error" },
    "item-equipable-by": {
      label: "\u7269\u54C1\u53EF\u88C5\u5907\u4EBA\u7269",
      ownership: "external",
      danglingSeverity: "warn"
    },
    "item-battle-sprite-by-actor": {
      label: "\u88C5\u5907\u6218\u6597\u5F62\u8C61\u6620\u5C04",
      ownership: "external",
      danglingSeverity: "error"
    },
    "command-set-actor-sprite": {
      label: "\u811A\u672C\u4EBA\u7269\u7CBE\u7075\u5207\u6362",
      ownership: "external",
      danglingSeverity: "error"
    },
    "command-set-actor-appearance": {
      label: "\u811A\u672C\u4EBA\u7269\u5916\u89C2\u5207\u6362",
      ownership: "external",
      danglingSeverity: "error"
    },
    "command-set-party-member": {
      label: "\u811A\u672C\u961F\u4F0D\u6210\u5458",
      ownership: "external",
      danglingSeverity: "error"
    },
    "command-actor-condition": {
      label: "\u811A\u672C\u89D2\u8272\u5F53\u524D\u72B6\u6001",
      ownership: "external",
      danglingSeverity: "error"
    },
    "enemy-apply-actor-growth": {
      label: "\u654C\u4EBA\u7F16\u6392\u4EBA\u7269\u6210\u957F",
      ownership: "external",
      danglingSeverity: "error"
    },
    "enemy-play-actor-cast-effect": {
      label: "\u654C\u4EBA\u7F16\u6392\u4EBA\u7269\u65BD\u6CD5\u8868\u73B0",
      ownership: "external",
      danglingSeverity: "error"
    },
    "dialogue-actor": { label: "\u4EBA\u7269\u5BF9\u8BDD\u8EAB\u4EFD", ownership: "external", danglingSeverity: "error" },
    "level-up-owner": { label: "\u5347\u7EA7\u4E60\u5F97\u4F34\u968F\u8868", ownership: "companion", danglingSeverity: "warn" },
    "world-party-template": {
      label: "\u8FD0\u884C\u6001\u961F\u4F0D\u6A21\u677F",
      ownership: "runtime-readonly",
      danglingSeverity: "error"
    },
    "world-reserve-template": {
      label: "\u8FD0\u884C\u6001\u540E\u5907\u6A21\u677F",
      ownership: "runtime-readonly",
      danglingSeverity: "error"
    }
  });

  // packages/content/src/skill.ts
  var ENEMY_RUNTIME_SKILL_EFFECT_KINDS = [
    "damage",
    "healHp",
    "applyStatus",
    "applyPoison",
    "gate",
    "instantKill",
    "resourceDelta"
  ];
  var ENEMY_RUNTIME_SKILL_EFFECT_KIND_SET = new Set(
    ENEMY_RUNTIME_SKILL_EFFECT_KINDS
  );

  // packages/content/src/asset.ts
  var ASSET_KINDS = [
    "music",
    "sound",
    "soundfont",
    "tileset",
    "sprite",
    "battle-sprite",
    "effect-sprite",
    "portrait",
    "face",
    "item-icon",
    "battle-background",
    "video",
    "frame-animation",
    "color-table"
  ];
  var ASSET_ROLES = [
    "audio.midiSoundfont",
    "audio.defaultBattleMusic",
    "audio.bossVictoryMusic",
    "audio.normalVictoryMusic",
    "audio.openingMenuMusic",
    "audio.battleItemUseSound",
    "audio.battleCoopCastSound",
    "audio.battleEscapeSound",
    "audio.battleEnemyTransformSound",
    "video.startupTrademark",
    "video.startupSplash",
    "visual.standardColorTable"
  ];
  var AUDIO_ASSET_ROLES = {
    "audio.midiSoundfont": "soundfont",
    "audio.defaultBattleMusic": "music",
    "audio.bossVictoryMusic": "music",
    "audio.normalVictoryMusic": "music",
    "audio.openingMenuMusic": "music"
  };
  var SOUND_ASSET_ROLES = {
    "audio.battleItemUseSound": "sound",
    "audio.battleCoopCastSound": "sound",
    "audio.battleEscapeSound": "sound",
    "audio.battleEnemyTransformSound": "sound"
  };
  var ASSET_ROLE_KINDS = {
    ...AUDIO_ASSET_ROLES,
    ...SOUND_ASSET_ROLES,
    "video.startupTrademark": "video",
    "video.startupSplash": "video",
    "visual.standardColorTable": "color-table"
  };
  var kindSet = new Set(ASSET_KINDS);
  var roleSet = new Set(ASSET_ROLES);

  // packages/content/src/script.ts
  var SCENE_ENTRY_PREPARE_SAFETY = {
    addVar: "safe",
    animEntity: "safe",
    applyActorCondition: "safe",
    branch: "blocked",
    callScript: "blocked",
    cameraPan: "blocked",
    cameraSnap: "safe",
    chasePlayer: "blocked",
    clearDialog: "safe",
    clearActorCondition: "safe",
    clearSceneScripts: "safe",
    confirm: "blocked",
    dialog: "blocked",
    ditherScreen: "blocked",
    endBattle: "safe",
    fade: "blocked",
    fleeBattle: "safe",
    gameOver: "blocked",
    giveItem: "safe",
    giveMoney: "safe",
    halveMoney: "safe",
    holdScreen: "blocked",
    increaseHpMp: "safe",
    jumpScript: "blocked",
    learnSkill: "safe",
    loadLastSave: "blocked",
    loadScene: "blocked",
    loseItem: "safe",
    mountParty: "safe",
    moveEntity: "blocked",
    moveParty: "blocked",
    nudgeEntity: "safe",
    nudgeParty: "safe",
    openShop: "blocked",
    playMusic: "safe",
    playEntityAction: "blocked",
    stopMusic: "safe",
    playFrameAnimation: "blocked",
    playSound: "safe",
    playVideo: "blocked",
    quitToTitle: "blocked",
    releaseEntity: "safe",
    revealScreen: "blocked",
    revivePartyAll: "safe",
    ride: "blocked",
    setActorAppearance: "blocked",
    setActorSprite: "blocked",
    setAmbience: "safe",
    setEntityAuto: "safe",
    setEntityFacing: "safe",
    setEntityFrame: "safe",
    setEntityLayer: "safe",
    setEntityPos: "safe",
    setEntityPosRelParty: "safe",
    setEntityState: "safe",
    setEntityTrigger: "safe",
    setEntityTriggerMode: "safe",
    setFlag: "safe",
    setFollowers: "safe",
    setMultiEntityState: "safe",
    setParty: "safe",
    setPartyFacing: "safe",
    setSceneMapOverride: "blocked",
    setSceneOnEnter: "safe",
    setSceneOnTeleport: "safe",
    setScreenWave: "safe",
    setVar: "safe",
    shakeScreen: "safe",
    startBattle: "blocked",
    stepEntity: "safe",
    stopScript: "blocked",
    stopEntityAction: "safe",
    takeEntity: "safe",
    teleportOut: "blocked",
    teleportParty: "safe",
    toggleDayNight: "safe",
    unequip: "safe",
    unmountParty: "safe",
    vanishEntity: "safe",
    // PAL 的场景入场脚本会在清对话后等待数帧，再修改目标场景实体并揭示画面。
    // wait 不读取/呈现目标世界，因而可以在隐藏目标画面的 prepare 阶段安全执行。
    wait: "safe"
  };

  // packages/content/src/author-script-core.ts
  var RETAINED_RUNTIME_COMMAND_KINDS = Object.fromEntries(
    Object.keys(SCENE_ENTRY_PREPARE_SAFETY).map((kind) => [kind, true])
  );
  var AUTHOR_ONLY_COMMAND_KINDS = {
    loop: true,
    selectEntityBehavior: true,
    selectEntityPage: true,
    setEntityTriggerActivation: true,
    selectSceneHooks: true
  };
  var AUTHOR_COMMAND_KIND_TABLE = {
    ...RETAINED_RUNTIME_COMMAND_KINDS,
    jumpScript: false,
    setEntityAuto: false,
    setEntityTrigger: false,
    setEntityTriggerMode: false,
    setSceneOnEnter: false,
    setSceneOnTeleport: false,
    clearSceneScripts: false,
    ...AUTHOR_ONLY_COMMAND_KINDS
  };
  var BASE_AUTHOR_COMMAND_KINDS = AUTHOR_COMMAND_KIND_TABLE;

  // packages/content/src/item.ts
  var EQUIP_SLOT_IDS = ["weapon", "head", "body", "cloak", "feet", "accessory"];
  var ITEM_USE_EFFECT_KINDS = {
    healHp: true,
    healMp: true,
    revive: true,
    applyStatus: true,
    removeStatus: true,
    applyPoison: true,
    curePoison: true,
    permanentStatBoost: true,
    gate: true,
    dieIfNotPoisoned: true,
    runScript: true,
    runSceneHook: true,
    craftRecipe: true,
    drawFromResourcePool: true,
    extraPoisonRes: true,
    hideParty: true,
    modifyHostileAwareness: true,
    scaleCurrentHp: true,
    levelUp: true,
    placeEntityInFront: true
  };

  // packages/content/src/author-item-core.ts
  var AUTHOR_ITEM_USE_EFFECT_KINDS = {
    ...ITEM_USE_EFFECT_KINDS,
    itemPrivateScript: true
  };

  // packages/content/src/runtime-script.ts
  var RUNTIME_COMMAND_KINDS = Object.freeze({
    ...BASE_AUTHOR_COMMAND_KINDS,
    suspendEntity: true,
    hideEntity: true,
    restoreEntity: true,
    removeEntity: true,
    vanishEntity: false
  });

  // packages/content/src/migration-diagnostic.ts
  var MIGRATION_DIAGNOSTIC_CATEGORIES = [
    "unsupported-command",
    "missing-source-data",
    "story-script",
    "empty-script",
    "manual-review"
  ];
  var categorySet = new Set(MIGRATION_DIAGNOSTIC_CATEGORIES);

  // packages/reforge/src/engine-chrome/registry.ts
  var frameSlots = (dir) => Array.from({ length: 9 }, (_, index) => `${dir}/frame-0${index}.png`);
  var digitSlots = (dir) => Array.from({ length: 10 }, (_, index) => `${dir}/${index}.png`);
  var ENGINE_CHROME_UI_SLOTS = [
    "battle/icon-attack.png",
    "battle/icon-magic.png",
    "battle/icon-coop.png",
    "battle/icon-misc.png",
    ...frameSlots("box"),
    ...frameSlots("box-red"),
    "cursor/down.png",
    "cursor/grid.png",
    "cursor/settle-arrow.png",
    "cursor/up-red.png",
    "cursor/up.png",
    ...frameSlots("itembox"),
    "magic/playerbox.png",
    ...digitSlots("num"),
    ...digitSlots("num-blue"),
    ...digitSlots("num-cyan"),
    "num/slash.png",
    ...frameSlots("scroll"),
    "status/bg.png",
    "status/slot.png",
    "status/equip-demo/accessory.png",
    "status/equip-demo/amulet.png",
    "status/equip-demo/body.png",
    "status/equip-demo/feet.png",
    "status/equip-demo/head.png",
    "status/equip-demo/weapon.png"
  ];
  var bundledUi = __rv2Glob("./assets/ui/**/*.png", {
    eager: true,
    query: "?url",
    import: "default"
  });
  var ENGINE_CHROME = {
    fontBdf: new URL("../../../../data/raw/unifont-cn.bdf", document.baseURI).href,
    dialogCursor: new URL("./assets/dialog-icons-raw.json", document.baseURI).href,
    defaultTitle: new URL("./assets/title.png", document.baseURI).href,
    provenance: new URL("./assets/PROVENANCE.md", document.baseURI).href,
    unifontOfl: new URL("./assets/licenses/OFL-1.1.txt", document.baseURI).href,
    unifontCopying: new URL("./assets/licenses/COPYING", document.baseURI).href
  };

  // packages/reforge/src/text/glyph.ts
  function decodeGlyph(glyph, rgba) {
    const out = new Uint8Array(glyph.width * glyph.height * 4);
    const bytesPerRow = Math.ceil(glyph.width / 8);
    for (let row = 0; row < glyph.height; row++) {
      for (let col = 0; col < glyph.width; col++) {
        const byteIdx = row * bytesPerRow + Math.floor(col / 8);
        const bit = (glyph.bitmap[byteIdx] ?? 0) >> 7 - col % 8 & 1;
        if (bit) {
          const o = (row * glyph.width + col) * 4;
          out[o] = rgba[0];
          out[o + 1] = rgba[1];
          out[o + 2] = rgba[2];
          out[o + 3] = 255;
        }
      }
    }
    return out;
  }
  function parseBdfGlyphs(text, source = "BDF") {
    const lines = text.split(/\r?\n/);
    const map = /* @__PURE__ */ new Map();
    for (let index = 0; index < lines.length; index++) {
      if (!lines[index]?.trim().startsWith("STARTCHAR")) continue;
      let codepoint = -1;
      let width = 16;
      let height = 16;
      while (index < lines.length) {
        const line = lines[index]?.trim() ?? "";
        if (line.startsWith("ENCODING")) codepoint = Number.parseInt(line.split(/\s+/)[1] ?? "", 10);
        else if (line.startsWith("BBX")) {
          const parts = line.split(/\s+/);
          width = Number.parseInt(parts[1] ?? "16", 10);
          height = Number.parseInt(parts[2] ?? "16", 10);
        } else if (line === "BITMAP") {
          index++;
          break;
        }
        index++;
      }
      const bytesPerRow = Math.ceil(width / 8);
      const bitmap = new Uint8Array(bytesPerRow * height);
      for (let row = 0; row < height && index < lines.length; row++, index++) {
        const hexRow = lines[index]?.trim() ?? "";
        if (hexRow === "ENDCHAR") break;
        for (let byte = 0; byte < bytesPerRow; byte++)
          bitmap[row * bytesPerRow + byte] = Number.parseInt(hexRow.slice(byte * 2, byte * 2 + 2), 16) || 0;
      }
      while (index < lines.length && lines[index]?.trim() !== "ENDCHAR") index++;
      if (codepoint > 0) map.set(codepoint, { width, height, bitmap });
    }
    if (map.size === 0) throw new Error(`\u5F15\u64CE chrome \u5B57\u5F62\u4E3A\u7A7A:${source}`);
    return {
      size: map.size,
      has: (cp) => map.has(cp),
      get: (cp) => map.get(cp)
    };
  }
  var cache = /* @__PURE__ */ new Map();
  function glyphCacheKey(cp, rgba) {
    return `${cp}:${rgba[0]},${rgba[1]},${rgba[2]}`;
  }
  function bakeGlyph(cp, glyph, rgba) {
    const key = glyphCacheKey(cp, rgba);
    const hit = cache.get(key);
    if (hit) return hit;
    const cvs = document.createElement("canvas");
    cvs.width = glyph.width;
    cvs.height = glyph.height;
    const ctx = cvs.getContext("2d");
    if (!ctx) throw new Error("reforge: glyph 2d context \u4E0D\u53EF\u7528");
    const img = ctx.createImageData(glyph.width, glyph.height);
    img.data.set(decodeGlyph(glyph, rgba));
    ctx.putImageData(img, 0, 0);
    cache.set(key, cvs);
    return cvs;
  }

  // packages/reforge/src/text/palette-color.ts
  var DIALOG_RGBA = {
    default: [199, 186, 174],
    // 原 0x4F
    cyan: [121, 219, 186],
    // 原 0x8D
    red: [190, 73, 60],
    // 原 0x1A
    redAlt: [150, 32, 24],
    // 原 0x17
    yellow: [255, 223, 134]
    // 原 0x2D
  };
  function colorRgba(c) {
    return DIALOG_RGBA[c];
  }

  // packages/reforge/src/text/text-render.ts
  var SHADOW_RGBA = [0, 0, 0];
  function renderSpans(ctx, spans, x, y, opts) {
    let cursorX = x;
    let shown = 0;
    const limit = opts.maxChars ?? Number.POSITIVE_INFINITY;
    for (const span of spans) {
      const rgba = opts.forceRgba ?? colorRgba(span.color ?? "default");
      for (const ch of span.text) {
        if (shown >= limit) return cursorX - x;
        const cp = ch.codePointAt(0) ?? 0;
        const g = opts.glyphs.get(cp);
        const w = g?.width ?? 16;
        if (g) {
          if (opts.shadow) {
            const s = bakeGlyph(cp, g, opts.shadowRgba ?? SHADOW_RGBA);
            const sx = opts.bold ? 2 : 1;
            ctx.drawImage(s, cursorX + sx, y);
            ctx.drawImage(s, cursorX, y + 1);
            ctx.drawImage(s, cursorX + sx, y + 1);
          }
          const main2 = bakeGlyph(cp, g, rgba);
          ctx.drawImage(main2, cursorX, y);
          if (opts.bold) ctx.drawImage(main2, cursorX + 1, y);
        }
        cursorX += w;
        shown++;
      }
    }
    return cursorX - x;
  }
  function measureSpans(spans, glyphs) {
    let w = 0;
    for (const span of spans) {
      for (const ch of span.text) {
        w += glyphs.get(ch.codePointAt(0) ?? 0)?.width ?? 16;
      }
    }
    return w;
  }

  // packages/reforge/src/menu/menu-box.ts
  function tileFill(ctx, img, dx, dy, dw, dh) {
    if (dw <= 0 || dh <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();
    for (let yy = dy; yy < dy + dh; yy += img.height) {
      for (let xx = dx; xx < dx + dw; xx += img.width) {
        ctx.drawImage(img, xx, yy);
      }
    }
    ctx.restore();
  }
  function drawBoxShadow(ctx, box, x, y, w, h) {
    const off = document.createElement("canvas");
    off.width = Math.ceil(w) + 16;
    off.height = Math.ceil(h) + 16;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.imageSmoothingEnabled = false;
    drawSlicedBox(octx, box, 0, 0, w, h, { shadow: false });
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = "#000";
    octx.fillRect(0, 0, off.width, off.height);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(off, x + 6, y + 6);
    ctx.restore();
  }
  function drawSlicedBox(ctx, box, x, y, w, h, opts = {}) {
    const { tiles } = box;
    const t = (i, j) => tiles[i * 3 + j];
    const tl = t(0, 0);
    const tr = t(0, 2);
    const bl = t(2, 0);
    const br = t(2, 2);
    const top = t(0, 1);
    const bottom = t(2, 1);
    const left = t(1, 0);
    const right = t(1, 2);
    const center = t(1, 1);
    if (opts.shadow !== false) drawBoxShadow(ctx, box, x, y, w, h);
    const leftW = left?.width ?? tl?.width ?? 0;
    const rightW = right?.width ?? tr?.width ?? 0;
    const topH = top?.height ?? tl?.height ?? 0;
    const botH = bottom?.height ?? bl?.height ?? 0;
    const innerX = x + leftW;
    const innerY = y + topH;
    const innerW = w - leftW - rightW;
    const innerH = h - topH - botH;
    const rightColX = x + w - rightW;
    const botRowY = y + h - botH;
    if (center) tileFill(ctx, center, innerX, innerY, innerW, innerH);
    if (top) tileFill(ctx, top, innerX, y, innerW, topH);
    if (bottom) tileFill(ctx, bottom, innerX, botRowY, innerW, botH);
    if (left) tileFill(ctx, left, x, innerY, leftW, innerH);
    if (right) tileFill(ctx, right, rightColX, innerY, rightW, innerH);
    if (tl) ctx.drawImage(tl, x, y);
    if (tr) ctx.drawImage(tr, rightColX, y);
    if (bl) ctx.drawImage(bl, x, botRowY);
    if (br) ctx.drawImage(br, rightColX, botRowY);
  }
  var COLOR_NORMAL = [199, 186, 174];
  var COLOR_DISABLED = [166, 40, 32];
  var COLOR_DISABLED_SEL = [215, 109, 93];
  var SELECTED_COLORS = [
    [247, 231, 109],
    [235, 211, 97],
    [227, 190, 89],
    [219, 174, 81],
    [231, 195, 93],
    [243, 219, 105]
  ];
  function drawNumber(ctx, value, rightX, y, nums) {
    const s = String(Math.max(0, Math.floor(value)));
    let x = rightX;
    for (let i = s.length - 1; i >= 0; i--) {
      const d = s.charCodeAt(i) - 48;
      const img = nums[d];
      if (img) {
        x -= img.width;
        ctx.drawImage(img, x, y);
      }
    }
  }
  function drawNumberLeft(ctx, value, leftX, y, nums) {
    const s = String(Math.max(0, Math.floor(value)));
    let x = leftX;
    for (let i = 0; i < s.length; i++) {
      const img = nums[s.charCodeAt(i) - 48];
      if (img) {
        ctx.drawImage(img, x, y);
        x += img.width;
      }
    }
  }
  function drawScroll(ctx, scroll, x, y, nLen, opts = {}) {
    const t = scroll.tiles;
    const leftW = t[3]?.width ?? 0;
    const midW = t[4]?.width ?? 0;
    const rightW = t[5]?.width ?? 0;
    const h = (t[1]?.height ?? 0) + (t[4]?.height ?? 0) + (t[7]?.height ?? 0);
    const w = leftW + midW * nLen + rightW;
    if (w <= 0 || h <= 0) return;
    drawSlicedBox(ctx, scroll, x, y, w, h, opts);
  }
  var EQUIP_SLOTS = EQUIP_SLOT_IDS.map((slot) => ({
    slot,
    label: `equip.${slot}`
  }));

  // packages/reforge/src/battle/battle-ui.ts
  var MAGIC_GRID = {
    box: { x: 10, y: 42, w: 300, h: 114 },
    item0: { x: 35, y: 54 },
    colW: 87,
    rowH: 18,
    rows: 5,
    pageOffset: 2
  };
  function drawBattleGrid(ctx, menu, glyphs, rows, cursor, now, lay) {
    drawSlicedBox(ctx, menu.redBox, lay.box.x, lay.box.y, lay.box.w, lay.box.h);
    const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL;
    let pageStart = Math.floor(cursor / 3) * 3 - 3 * lay.pageOffset;
    if (pageStart < 0) pageStart = 0;
    let i = pageStart;
    outer: for (let row = 0; row < lay.rows; row++) {
      for (let col = 0; col < 3; col++) {
        if (i >= rows.length) break outer;
        const r = rows[i];
        if (!r) continue;
        const selected = i === cursor;
        let color;
        if (selected) color = r.disabled ? COLOR_DISABLED_SEL : blink;
        else color = r.disabled ? COLOR_DISABLED : COLOR_NORMAL;
        const x = lay.item0.x + col * lay.colW;
        const y = lay.item0.y + row * lay.rowH;
        renderSpans(ctx, [{ text: r.label }], x, y, { glyphs, shadow: true, forceRgba: color });
        if (lay.amountX !== void 0 && r.right !== void 0 && r.right > 1) {
          drawNumber(ctx, r.right, x + lay.amountX, y + 5, menu.numsCyan);
        }
        if (selected && menu.cursorGrid) ctx.drawImage(menu.cursorGrid, x + 25, y + 10);
        i++;
      }
    }
  }
  function drawMpBox(ctx, menu, needed, current) {
    drawScroll(ctx, menu.scroll, 0, 0, 5);
    if (menu.slash) ctx.drawImage(menu.slash, 45, 14);
    drawNumber(ctx, needed, 39, 14, menu.nums);
    drawNumber(ctx, current, 74, 14, menu.numsCyan);
  }
  function drawItemDetailBox(ctx, menu, icon) {
    drawSlicedBox(ctx, menu.itembox, 0, 140, 64, 64);
    if (icon) ctx.drawImage(icon, 8, 147);
  }
  function drawCurrentFinger(ctx, menu, baseX, baseY, now) {
    const img = Math.floor(now / 160) % 2 === 0 ? menu.cursorDown : menu.cursorGrid;
    if (img) ctx.drawImage(img, baseX - 8, baseY - 74);
  }
  function drawPlayerTargetArrow(ctx, menu, baseX, baseY, now) {
    const img = (Math.floor(now / 40) & 1) === 1 ? menu.cursorUpRed : menu.cursorUp;
    if (img) ctx.drawImage(img, baseX - 8, baseY - 67);
  }

  // packages/reforge/src/defined.ts
  function expectDefined(value) {
    if (value === void 0 || value === null) throw new Error("Expected value to be defined");
    return value;
  }

  // packages/reforge/src/battle/settlement.ts
  var COLOR_LABEL = [199, 186, 174];
  var COLOR_LEVELUP_LABEL = [214, 198, 140];
  var COLOR_MAGIC = [140, 180, 235];
  var LEVELUP_LABELS = ["\u4FEE\u884C", "\u4F53\u529B", "\u771F\u6C14", "\u6B66\u672F", "\u7075\u529B", "\u9632\u5FA1", "\u8EAB\u6CD5", "\u5409\u8FD0"];
  var HIDDEN_STAT_LABEL = {
    maxHP: "\u4F53\u529B",
    maxMP: "\u771F\u6C14",
    attack: "\u6B66\u672F",
    magicAttack: "\u7075\u529B",
    defense: "\u9632\u5FA1",
    speed: "\u8EAB\u6CD5",
    luck: "\u5409\u8FD0"
  };
  function buildSettlementScreens(exp, cash, levelUps, hiddenUps, nameOf, skillNameOf) {
    const screens = [];
    if (exp > 0) screens.push({ kind: "exp-cash", exp, cash });
    const hiddenScreen = (h) => ({
      kind: "hidden-up",
      name: nameOf(h.characterId),
      statLabel: HIDDEN_STAT_LABEL[h.stat],
      delta: h.delta
    });
    const emitted = /* @__PURE__ */ new Set();
    for (const lu of levelUps) {
      screens.push({ kind: "level-up", name: nameOf(lu.characterId), report: lu });
      for (const h of hiddenUps) {
        if (h.characterId === lu.characterId) {
          screens.push(hiddenScreen(h));
          emitted.add(h);
        }
      }
      for (const sid of lu.learned) {
        screens.push({
          kind: "learn-magic",
          name: nameOf(lu.characterId),
          magicName: skillNameOf(sid)
        });
      }
    }
    for (const h of hiddenUps) if (!emitted.has(h)) screens.push(hiddenScreen(h));
    return screens;
  }
  function drawSettlementScreen(ctx, screen, menu, glyphs) {
    switch (screen.kind) {
      case "exp-cash":
        drawExpCash(ctx, screen.exp, screen.cash, menu, glyphs);
        break;
      case "level-up":
        drawLevelUp(ctx, screen.name, screen.report, menu, glyphs);
        break;
      case "hidden-up":
        drawHiddenUp(ctx, screen.name, screen.statLabel, screen.delta, menu, glyphs);
        break;
      case "learn-magic":
        drawLearnMagic(ctx, screen.name, screen.magicName, menu, glyphs);
        break;
    }
  }
  function label(ctx, text, x, y, glyphs, color = COLOR_LABEL) {
    renderSpans(ctx, [{ text }], x, y, { glyphs, shadow: true, forceRgba: color });
  }
  var GLYPH_H = 16;
  var DIGIT_H = 8;
  function numWidth(n, nums) {
    let w = 0;
    for (const ch of String(Math.max(0, Math.floor(n)))) w += nums[Number(ch)]?.width ?? 6;
    return w;
  }
  function scrollBoxH(menu) {
    const t = menu.scroll.tiles;
    return (t[1]?.height ?? 4) + (t[4]?.height ?? 18) + (t[7]?.height ?? 4);
  }
  function drawScrollLine(ctx, menu, glyphs, y, parts) {
    const GAP = 4;
    const PAD = 6;
    const t = menu.scroll.tiles;
    const leftW = t[3]?.width ?? 8;
    const midW = t[4]?.width ?? 16;
    const rightW = t[5]?.width ?? 8;
    const boxH = scrollBoxH(menu);
    const partW = (p) => "num" in p ? numWidth(p.num, menu.nums) : measureSpans([{ text: p.text }], glyphs);
    const contentW = parts.reduce((w, p) => w + partW(p), 0) + GAP * (parts.length - 1);
    const nLen = Math.max(1, Math.ceil((contentW + PAD * 2) / midW));
    const boxW = leftW + midW * nLen + rightW;
    const x = Math.round((320 - boxW) / 2);
    drawScroll(ctx, menu.scroll, x, y, nLen);
    const textY = y + Math.round((boxH - GLYPH_H) / 2);
    const numY = textY + Math.round((GLYPH_H - DIGIT_H) / 2);
    let px = Math.round(x + leftW + (midW * nLen - contentW) / 2);
    for (const p of parts) {
      if ("num" in p) {
        drawNumberLeft(ctx, p.num, px, numY, menu.nums);
      } else {
        renderSpans(ctx, [{ text: p.text }], px, textY, {
          glyphs,
          shadow: true,
          forceRgba: p.color ?? COLOR_LABEL
        });
      }
      px += partW(p) + GAP;
    }
  }
  function drawExpCash(ctx, exp, cash, menu, glyphs) {
    const h = scrollBoxH(menu);
    const GAPV = 12;
    const y0 = Math.round((200 - (2 * h + GAPV)) / 2);
    drawScrollLine(ctx, menu, glyphs, y0, [{ text: "\u83B7\u5F97\u7ECF\u9A8C\u503C" }, { num: exp }]);
    drawScrollLine(ctx, menu, glyphs, y0 + h + GAPV, [
      { text: "\u6253\u8D25\u654C\u4EBA\u5F97" },
      { num: cash },
      { text: "\u6587\u94B1" }
    ]);
  }
  function drawStatValue(ctx, curRightX, y, menu, cur, max) {
    drawNumberLeft(ctx, cur, curRightX - numWidth(cur, menu.nums), y, menu.nums);
    if (max === void 0) return;
    let px = curRightX + 1;
    if (menu.slash) {
      ctx.drawImage(menu.slash, px, y);
      px += menu.slash.width + 1;
    }
    drawNumberLeft(ctx, max, px, y + 3, menu.numsBlue);
  }
  function drawLevelUp(ctx, name, rep, menu, glyphs) {
    const t = menu.scroll.tiles;
    const leftW = t[3]?.width ?? 8;
    const midW = t[4]?.width ?? 16;
    const rightW = t[5]?.width ?? 8;
    const titleH = scrollBoxH(menu);
    const NLEN = 10;
    const BOX_W = leftW + midW * NLEN + rightW;
    const BOX_X = Math.round((320 - BOX_W) / 2);
    const ROW_H = 18;
    const BOX_H = 8 * ROW_H + 10;
    const titleY = Math.round((200 - (titleH + 2 + BOX_H)) / 2);
    const BOX_Y = titleY + titleH + 2;
    drawScroll(ctx, menu.scroll, BOX_X, titleY, NLEN);
    const titleText = `${name}\u4FEE\u884C\u63D0\u5347`;
    const tw = measureSpans([{ text: titleText }], glyphs);
    renderSpans(
      ctx,
      [{ text: titleText }],
      BOX_X + Math.round((BOX_W - tw) / 2),
      titleY + Math.round((titleH - GLYPH_H) / 2),
      {
        glyphs,
        shadow: true,
        forceRgba: COLOR_LABEL
      }
    );
    drawSlicedBox(ctx, menu.redBox, BOX_X, BOX_Y, BOX_W, BOX_H);
    const b = rep.before;
    const a = rep.after;
    const rows = [
      { lab: expectDefined(LEVELUP_LABELS[0]), old: b.level, cur: a.level },
      {
        lab: expectDefined(LEVELUP_LABELS[1]),
        old: b.hp,
        cur: a.hp,
        oldMax: b.maxHP,
        curMax: a.maxHP
      },
      {
        lab: expectDefined(LEVELUP_LABELS[2]),
        old: b.mp,
        cur: a.mp,
        oldMax: b.maxMP,
        curMax: a.maxMP
      },
      { lab: expectDefined(LEVELUP_LABELS[3]), old: b.attack, cur: a.attack },
      { lab: expectDefined(LEVELUP_LABELS[4]), old: b.magicAttack, cur: a.magicAttack },
      { lab: expectDefined(LEVELUP_LABELS[5]), old: b.defense, cur: a.defense },
      { lab: expectDefined(LEVELUP_LABELS[6]), old: b.speed, cur: a.speed },
      { lab: expectDefined(LEVELUP_LABELS[7]), old: b.luck, cur: a.luck }
    ];
    const LABEL_X = BOX_X + 16;
    const OLD_CUR_RIGHT = BOX_X + 78;
    const ARROW_X = BOX_X + 108;
    const CUR_CUR_RIGHT = BOX_X + 142;
    rows.forEach((r, j) => {
      const ly = BOX_Y + 8 + ROW_H * j;
      const ny = ly + 2;
      label(ctx, r.lab, LABEL_X, ly, glyphs, COLOR_LEVELUP_LABEL);
      drawStatValue(ctx, OLD_CUR_RIGHT, ny, menu, r.old, r.oldMax);
      if (menu.settleArrow) ctx.drawImage(menu.settleArrow, ARROW_X, ly + 4);
      drawStatValue(ctx, CUR_CUR_RIGHT, ny, menu, r.cur, r.curMax);
    });
  }
  function drawHiddenUp(ctx, name, statLabel, delta, menu, glyphs) {
    const y = Math.round((200 - scrollBoxH(menu)) / 2);
    drawScrollLine(ctx, menu, glyphs, y, [{ text: `${name}${statLabel}\u63D0\u5347` }, { num: delta }]);
  }
  function drawLearnMagic(ctx, name, magicName, menu, glyphs) {
    const y = Math.round((200 - scrollBoxH(menu)) / 2);
    drawScrollLine(ctx, menu, glyphs, y, [
      { text: name },
      { text: "\u7EC3\u6210" },
      { text: magicName, color: COLOR_MAGIC }
    ]);
  }

  // docs/testing/glm-runtime-resource-wave/hosts/rv3-rv4/entry.ts
  async function fetchBitmap(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return createImageBitmap(await res.blob());
  }
  async function fetchTiles(dir) {
    const tiles = [];
    for (let i = 0; i < 9; i++) {
      tiles.push(await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/${dir}/frame-0${i}.png`));
    }
    return { tiles };
  }
  async function fetchDigits(dir) {
    const out = [];
    for (let d = 0; d < 10; d++) {
      out.push(await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/${dir}/${d}.png`));
    }
    return out;
  }
  var errors = [];
  window.addEventListener("error", (e) => errors.push(`window: ${e.message}`));
  async function main() {
    const [box, redBox, scroll, itembox, nums, numsBlue, numsCyan, slash, cursorGrid, cursorDown, cursorUp, cursorUpRed] = await Promise.all([
      fetchTiles("box"),
      fetchTiles("box-red"),
      fetchTiles("scroll"),
      fetchTiles("itembox"),
      fetchDigits("num"),
      fetchDigits("num-blue"),
      fetchDigits("num-cyan"),
      fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/num/slash.png"),
      fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/cursor/grid.png"),
      fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/cursor/down.png"),
      fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/cursor/up.png"),
      fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/cursor/up-red.png")
    ]);
    const menu = {
      box,
      itembox,
      statusBg: await fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/status/bg.png"),
      equipSlot: await fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/status/slot.png"),
      scroll,
      nums,
      avatar: void 0,
      numsBlue,
      numsCyan,
      slash,
      itemIcons: { "i:herb": await fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/battle/icon-attack.png") },
      redBox,
      magicPlayerBox: await fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/magic/playerbox.png"),
      cursorGrid,
      cursorUp,
      cursorUpRed,
      cursorDown,
      settleArrow: await fetchBitmap("/packages/reforge/src/engine-chrome/assets/ui/cursor/settle-arrow.png"),
      battleIcons: []
    };
    const bdf = await fetch("/data/raw/unifont-cn.bdf");
    if (!bdf.ok) throw new Error(`unifont HTTP ${bdf.status}`);
    const glyphs = parseBdfGlyphs(await bdf.text(), "unifont-cn.bdf(RV3/4)");
    const canvas = document.getElementById("stage");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, 960, 600);
    const battlePanel = (px, py, draw) => {
      ctx.save();
      ctx.scale(3, 3);
      ctx.translate(px / 3, py / 3);
      draw();
      ctx.restore();
    };
    const rowsEnabled = [
      { label: "\u7269\u7406" },
      { label: "\u4ED9\u672F" },
      { label: "\u5408\u51FB" },
      { label: "\u6742\u9879", right: 3 }
    ];
    const rowsDisabled = [
      { label: "\u7269\u7406", disabled: true },
      { label: "\u4ED9\u672F", disabled: true },
      { label: "\u5408\u51FB", disabled: true }
    ];
    battlePanel(0, 0, () => drawBattleGrid(ctx, menu, glyphs, rowsEnabled, 1, 0, MAGIC_GRID));
    battlePanel(320, 0, () => drawBattleGrid(ctx, menu, glyphs, rowsDisabled, 0, 0, MAGIC_GRID));
    battlePanel(0, 200, () => {
      drawMpBox(ctx, menu, 23, 8);
      drawItemDetailBox(ctx, menu, menu.itemIcons["i:herb"]);
    });
    battlePanel(320, 200, () => {
      drawCurrentFinger(ctx, menu, 160, 120, 0);
      drawPlayerTargetArrow(ctx, menu, 240, 150, 0);
    });
    const screens = buildSettlementScreens(
      15,
      100,
      [
        {
          characterId: "li-xiaoyao",
          from: 9,
          to: 10,
          learned: ["296"],
          before: { level: 9, hp: 300, maxHP: 300, mp: 50, maxMP: 50, attack: 90, magicAttack: 60, defense: 80, speed: 70, luck: 65 },
          after: { level: 10, hp: 330, maxHP: 330, mp: 55, maxMP: 55, attack: 95, magicAttack: 63, defense: 83, speed: 73, luck: 66 }
        }
      ],
      [{ characterId: "zhao-linger", stat: "luck", delta: 2 }],
      (id) => id === "li-xiaoyao" ? "\u674E\u900D\u9065" : "\u8D75\u7075\u513F",
      (id) => id === "296" ? "\u6C14\u7597\u672F" : id
    );
    const strip = document.getElementById("settle");
    const sctx = strip.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.fillStyle = "#222";
    sctx.fillRect(0, 0, 960, 120);
    screens.forEach((screen, i) => {
      sctx.save();
      sctx.scale(1.6, 1.6);
      sctx.translate(8 + i * 200, 8);
      drawSettlementScreen(sctx, screen, menu, glyphs);
      sctx.restore();
    });
    sctx.font = "12px system-ui";
    sctx.fillStyle = "#9cf";
    sctx.fillText(`\u7A7A\u62A5\u544A\u5C4F\u6570 = ${buildSettlementScreens(0, 0, [], [], (i) => i, (i) => i).length}\uFF08\u5BF9\u7167\uFF1A0 \u5C4F \u2192 \u65E0\u7ED8\u5236\uFF09`, 8, 116);
    const lit = (x, y, w, h) => {
      const data = ctx.getImageData(x * 3, y * 3, w * 3, h * 3).data;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] > 60) n++;
      return n;
    };
    const p1row1 = lit(35 + 87, 54, 60, 14);
    const p2row0 = lit(35, 54, 60, 14);
    const mpDigits = lit(0, 8, 60, 12);
    const finger = lit(152 - 8, 46 - 8, 30, 20);
    const arrow = lit(232 - 8, 83 - 8, 30, 20);
    const settleLit = (() => {
      const data = sctx.getImageData(0, 0, 960, 100).data;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] > 60) n++;
      return n;
    })();
    const results = [
      `P1 \u9009\u4E2D\u884C lit=${p1row1}`,
      `P2 \u7981\u7528\u884C lit=${p2row0}`,
      `MP \u54E8\u5175\u6570\u5B57\u533A lit=${mpDigits}`,
      `P4 \u5934\u6307 lit=${finger} \u7BAD\u5934 lit=${arrow}`,
      `RV4 \u7ED3\u7B97\u6761 lit=${settleLit}`
    ];
    const ok = p1row1 > 50 && p2row0 > 50 && mpDigits > 30 && finger > 20 && arrow > 20 && settleLit > 500 && errors.length === 0;
    document.getElementById("result").textContent = `${results.join(" \uFF1B ")} \uFF1B console/page errors: ${errors.length} ${errors.join("|")} \u2192 ${ok ? "ASSERT PASS" : "ASSERT FAIL"}`;
  }
  main().catch((err) => {
    document.getElementById("result").textContent = `HOST ERROR: ${err instanceof Error ? err.message : String(err)}`;
  });
})();
