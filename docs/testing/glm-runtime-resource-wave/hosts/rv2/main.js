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
  var STAT_LABEL = {
    attack: "\u6B66\u672F",
    magicAttack: "\u7075\u529B",
    defense: "\u9632\u5FA1",
    speed: "\u8EAB\u6CD5",
    luck: "\u5409\u8FD0"
  };
  var EQUIP_ELEM_LABEL = { poison: "\u6BD2", wind: "\u98CE", thunder: "\u96F7", water: "\u6C34", fire: "\u706B", earth: "\u571F" };
  var signed = (n) => n >= 0 ? `+${n}` : `${n}`;
  function describeEquipEffects(effects, ctx) {
    const numericPieces = [];
    const extraLines = [];
    for (const e of effects) {
      switch (e.kind) {
        case "statBonus":
          numericPieces.push(`${STAT_LABEL[e.stat]}${signed(e.delta)}`);
          break;
        case "maxPool":
          numericPieces.push(`${e.pool === "hp" ? "\u4F53\u529B" : "\u771F\u6C14"}\u4E0A\u9650${signed(e.delta)}`);
          break;
        case "resistance":
          numericPieces.push(`\u907F${EQUIP_ELEM_LABEL[e.element]}\u7387${signed(e.percent)}%`);
          break;
        case "attackAll":
          extraLines.push("\u653B\u51FB\u5168\u4F53");
          break;
        case "grantStatus":
          extraLines.push(`\u5E38\u9A7B\xB7${ACTOR_STATUS_DEFINITIONS[e.status].label}`);
          break;
        case "grantSkill":
          extraLines.push(`\u4E60\u5F97\xB7${ctx?.skillName?.(e.skillId) ?? e.skillId}`);
          break;
        case "battleSprite":
          for (const [actorId, spriteId] of Object.entries(e.byActor))
            extraLines.push(
              `\u6218\u6597\u5F62\u8C61\xB7${ctx?.actorName?.(actorId) ?? actorId}\u2192${ctx?.battleSpriteName?.(spriteId) ?? spriteId}`
            );
          break;
        case "regenHp":
          extraLines.push(`\u6BCF\u56DE\u5408\u56DE\u4F53\u529B${signed(e.amount)}`);
          break;
        case "regenMp":
          extraLines.push(`\u6BCF\u56DE\u5408\u56DE\u771F\u6C14${signed(e.amount)}`);
          break;
      }
    }
    const out = [];
    if (numericPieces.length) out.push(numericPieces.join("\u3000"));
    out.push(...extraLines);
    return out;
  }
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
  function equippedItemIds(world) {
    const ids = /* @__PURE__ */ new Set();
    for (const c of world.party) {
      for (const id of Object.values(c.equipment)) {
        if (id) ids.add(id);
      }
    }
    return ids;
  }

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

  // packages/reforge/src/defined.ts
  function expectDefined(value) {
    if (value === void 0 || value === null) throw new Error("Expected value to be defined");
    return value;
  }

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
  var EQUIP_SLOTS = EQUIP_SLOT_IDS.map((slot) => ({
    slot,
    label: `equip.${slot}`
  }));

  // packages/reforge/src/menu/item-list.ts
  var LIST_X = 2;
  var LIST_Y = 0;
  var LIST_W = 317;
  var LIST_H = 148;
  var ITEM_X0 = 15;
  var ITEM_Y0 = 12;
  var ITEM_DX = 100;
  var ITEM_DY = 18;
  var GRID_COLS = 3;
  var AMOUNT_DX = 81;
  var CURSOR_DX = 25;
  var CURSOR_DY = 10;
  var ITEMBOX_X = 0;
  var ITEMBOX_Y = 140;
  var ICON_DX = 8;
  var ICON_DY = 7;
  var DESC_X = 71;
  var DESC_Y = 151;
  var DESC_LINE_H = 16;
  var DESC_RIGHT = 316;
  var DESC_VISIBLE = 3;
  var COLOR_NORMAL = [199, 186, 174];
  var COLOR_DESC = [243, 239, 93];
  var COLOR_EQUIPPED = [81, 93, 44];
  var SELECTED_COLORS = [
    [247, 231, 109],
    [235, 211, 97],
    [227, 190, 89],
    [219, 174, 81],
    [231, 195, 93],
    [243, 219, 105]
  ];
  function drawDescLines(ctx, lines, glyphs, now) {
    const draw = (line, y) => {
      renderSpans(ctx, [{ text: line }], DESC_X, Math.round(y), {
        glyphs,
        shadow: true,
        forceRgba: COLOR_DESC
      });
    };
    if (lines.length <= DESC_VISIBLE) {
      lines.forEach((line, i) => {
        draw(line, DESC_Y + i * DESC_LINE_H);
      });
      return;
    }
    const visH = DESC_VISIBLE * DESC_LINE_H;
    const gap = DESC_LINE_H * 2;
    const period = lines.length * DESC_LINE_H + gap;
    const scroll = now / 50 % period;
    ctx.save();
    ctx.beginPath();
    ctx.rect(DESC_X - 2, DESC_Y - 2, DESC_RIGHT - DESC_X + 2, visH);
    ctx.clip();
    for (const base of [0, period]) {
      for (let i = 0; i < lines.length; i++) {
        const y = DESC_Y - scroll + base + i * DESC_LINE_H;
        if (y > DESC_Y - DESC_LINE_H && y < DESC_Y + visH) draw(expectDefined(lines[i]), y);
      }
    }
    ctx.restore();
  }
  function drawItemGridList(ctx, items, cursor, world, assets, glyphs, now, describeCtx, opts) {
    drawSlicedBox(ctx, assets.redBox, LIST_X, LIST_Y, LIST_W, LIST_H);
    const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL;
    const equipped = equippedItemIds(world);
    items.forEach((item, i) => {
      const k = i % GRID_COLS;
      const j = Math.floor(i / GRID_COLS);
      const x = ITEM_X0 + k * ITEM_DX;
      const y = ITEM_Y0 + j * ITEM_DY;
      const selected = i === cursor;
      const color = equipped.has(item.id) ? COLOR_EQUIPPED : selected ? blink : COLOR_NORMAL;
      renderSpans(ctx, [{ text: item.name }], x, y, {
        glyphs,
        shadow: true,
        forceRgba: color
      });
      const count = world.inventory.find((e) => e.itemId === item.id)?.count ?? 0;
      if (count > 1) drawNumber(ctx, count, ITEM_X0 + AMOUNT_DX + k * ITEM_DX, y + 5, assets.numsCyan);
      if (selected && assets.cursorGrid)
        ctx.drawImage(assets.cursorGrid, x + CURSOR_DX, y + CURSOR_DY);
    });
    drawSlicedBox(ctx, assets.itembox, ITEMBOX_X, ITEMBOX_Y, 64, 64);
    const sel = items[cursor];
    if (sel) {
      const icon = sel.icon ? assets.itemIcons[sel.icon] : void 0;
      if (icon) ctx.drawImage(icon, ITEMBOX_X + ICON_DX, ITEMBOX_Y + ICON_DY);
      if (!opts?.noDesc) {
        const lines = sel.equip ? [...sel.desc, ...describeEquipEffects(sel.equip.effects, describeCtx)] : sel.desc;
        drawDescLines(ctx, lines, glyphs, now);
      }
    }
  }

  // docs/testing/glm-runtime-resource-wave/hosts/rv2/entry.ts
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
    const ui = "/packages/reforge/src/engine-chrome/assets/ui";
    const [box, redBox, scroll, itembox, nums, numsBlue, numsCyan, slash, cursorGrid] = await Promise.all([
      fetchTiles("box"),
      fetchTiles("box-red"),
      fetchTiles("scroll"),
      fetchTiles("itembox"),
      fetchDigits("num"),
      fetchDigits("num-blue"),
      fetchDigits("num-cyan"),
      fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/num/slash.png`),
      fetchBitmap(`${ui}/cursor/grid.png`)
    ]);
    const assets = {
      box,
      itembox,
      statusBg: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/status/bg.png`),
      equipSlot: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/status/slot.png`),
      scroll,
      nums,
      avatar: void 0,
      numsBlue,
      numsCyan,
      slash,
      itemIcons: {},
      redBox,
      magicPlayerBox: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/magic/playerbox.png`),
      cursorGrid,
      cursorUp: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/up.png`),
      cursorUpRed: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/up-red.png`),
      cursorDown: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/down.png`),
      settleArrow: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/settle-arrow.png`),
      battleIcons: []
    };
    const bdfRes = await fetch("/data/raw/unifont-cn.bdf");
    if (!bdfRes.ok) throw new Error(`unifont HTTP ${bdfRes.status}`);
    const glyphs = parseBdfGlyphs(await bdfRes.text(), "unifont-cn.bdf(RV2)");
    const world = {
      party: [],
      learnedSkills: {},
      money: 0,
      inventory: [
        { itemId: "61", count: 2 },
        { itemId: "78", count: 1 }
      ]
    };
    const shortItems = [
      { id: "61", name: "\u89C2\u97F3\u7B26", desc: ["\u6062\u590D\u5355\u4EBA HP75\u3002"], buyPrice: 50, sellPrice: 25, sellable: true },
      { id: "78", name: "\u8336\u53F6\u86CB", desc: ["\u6062\u590D HP \u4E0E MP \u5404 15\u3002"], buyPrice: 10, sellPrice: 5, sellable: true }
    ];
    const longDesc = [
      "\u7075\u73E0\u8D77\u624B\uFF0C\u5929\u5730\u7075\u6C14",
      "\u51DD\u4E8E\u638C\u5FC3\u5982\u6C34\u6708\u955C\u82B1\uFF0C",
      "\u5176\u5149\u6D41\u8F6C\u4E0D\u606F\uFF1B",
      "\u4F69\u4E4B\u53EF\u5FA1\u4E94\u884C\u4E4B\u6BD2\uFF0C",
      "\u788E\u4E4B\u5219\u7075\u529B\u56DB\u6563\u6210\u96FE\uFF0C",
      "\u96FE\u6563\u4E4B\u5904\u767E\u8349\u540C\u67AF\u3002"
    ];
    const longItems = [
      { ...shortItems[0], desc: longDesc },
      shortItems[1]
    ];
    const canvas = document.getElementById("stage");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, 960, 600);
    const draw = (panelX, panelY, items, now) => {
      ctx.save();
      ctx.scale(3, 3);
      ctx.translate(panelX / 3, panelY / 3);
      drawItemGridList(ctx, items, 0, world, assets, glyphs, now);
      ctx.restore();
    };
    draw(0, 0, shortItems, 0);
    draw(320, 0, longItems, 0);
    draw(0, 200, longItems, 800);
    draw(320, 200, [], 0);
    const regionPixels = (x, y, w, h) => ctx.getImageData(x * 3, y * 3, w * 3, h * 3).data;
    const lit = (data) => {
      let n = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] > 60) n++;
      return n;
    };
    const results = [];
    results.push(`P1 \u6570\u91CF\u533A lit=${lit(regionPixels(80, 15, 20, 12))}`);
    results.push(`P1 \u5149\u6807\u533A lit=${lit(regionPixels(38, 20, 12, 10))}`);
    const p2 = regionPixels(71, 151, 240, 46);
    const p3 = regionPixels(71 + 0, 151 - 200 + 600, 240, 46);
    let diff = 0;
    for (let i = 0; i < p2.length; i += 4) {
      if (Math.abs(p2[i] - p3[i]) + Math.abs(p2[i + 1] - p3[i + 1]) + Math.abs(p2[i + 2] - p3[i + 2]) > 30) diff++;
    }
    results.push(`P2\u2192P3 \u8BF4\u660E\u533A\u5DEE\u5F02\u50CF\u7D20=${diff}`);
    const p1Name = lit(regionPixels(15, 12, 90, 16));
    const p4Name = lit(regionPixels(320 + 15, 200 + 12, 90, 16));
    results.push(`P1 \u6761\u76EE\u540D\u533A lit=${p1Name} \uFF1B P4 \u6761\u76EE\u540D\u533A lit=${p4Name}`);
    const ok = lit(regionPixels(80, 15, 20, 12)) > 5 && lit(regionPixels(38, 20, 12, 10)) > 5 && diff > 200 && p4Name < p1Name && // 空列表同区域仅框体，少于 P1 的文字+框
    errors.length === 0;
    document.getElementById("result").textContent = `${results.join(" \uFF1B ")} \uFF1B console/page errors: ${errors.length} ${errors.join("|")} \u2192 ${ok ? "ASSERT PASS" : "ASSERT FAIL"}`;
  }
  main().catch((err) => {
    document.getElementById("result").textContent = `HOST ERROR: ${err instanceof Error ? err.message : String(err)}`;
  });
})();
