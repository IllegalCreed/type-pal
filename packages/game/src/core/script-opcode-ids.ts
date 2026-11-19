/** Script opcode identifiers shared by interpreters and read-only event markers.
 * Keep these literals independent of interpreter state and DOM/resource setup.
 */
export const OP_START_BATTLE = 0x0007
export const OP_ADD_CASH = 0x001e
export const OP_ADD_ITEM = 0x001f
export const OP_PLAYER_FLEE = 0x003a
export const OP_PLAY_MUSIC = 0x0043
export const OP_PLAY_SOUND = 0x0047
export const OP_ADD_MAGIC = 0x0055
export const OP_ENEMY_ESCAPE = 0x0069
export const OP_STOP_MUSIC = 0x0077
export const OP_DELAY = 0x0085
export const OP_PLAY_CD_MUSIC = 0x00a3
