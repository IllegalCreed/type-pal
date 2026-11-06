import { fairyMazePlan } from './fairy-island-maze-route.mjs'

export {
  FAIRY_MAZE_LOOT as FAIRY_MAZE_GAME_LOOT,
  FAIRY_MAZE_STATUES as FAIRY_MAZE_GAME_STATUES,
} from './fairy-island-maze-route.mjs'

export const FAIRY_MAZE_GAME_SOURCES = [
  'data/extracted/events/all.json',
  'data/extracted/data/event-objects.json',
  'data/extracted/data/items.json',
  'data/extracted/lookup/strings.json',
  'data/extracted/lookup/words.json',
  ...['016', '017', '018'].map((scene) => `data/extracted/events/scene-${scene}.json`),
  ...[16, 17, 18].map((scene) => `data/extracted/data/scene/${scene}.json`),
  ...[6, 25, 119].map((map) => `data/extracted/data/tilemap/${map}.json`),
]

export function fairyMazeGamePlan() {
  return fairyMazePlan('game').map(({ ride: _ride, ...action }) => action)
}
