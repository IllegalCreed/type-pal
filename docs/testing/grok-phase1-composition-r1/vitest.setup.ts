import '../../../packages/game/vitest.setup.js'

// 选中色和箭头闪烁读 Date.now。固定为 0，使选中色停在 0xF9、当前箭头停在红帧 68。
Date.now = () => 0
