#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <new>
#include "rix.h"
#include "nuked/opl3.c.h"

class BrowserOpl : public Copl {
  opl3_chip chip{};
  uint32_t rate;
public:
  explicit BrowserOpl(uint32_t rate) : rate(rate) {}
  void init() override { OPL3_Reset(&chip, rate); }
  void write(int reg, int val) override { OPL3_WriteRegBuffered(&chip, reg, val); }
  void update(short *buf, int samples) override { OPL3_GenerateStream(&chip, buf, samples); }
};

struct Engine {
  BrowserOpl opl;
  CrixPlayer player;
  uint32_t offsets[4096]{};
  uint32_t offsetCount = 0;
  uint32_t rate;
  int64_t remainingSampleUnits = 0;
  int track = 0;
  bool loop = false;
  bool active = false;
  explicit Engine(uint32_t rate) : opl(rate), player(&opl), rate(rate) {}
};

static uint32_t read32(const uint8_t *p) {
  return uint32_t(p[0]) | (uint32_t(p[1]) << 8) | (uint32_t(p[2]) << 16) | (uint32_t(p[3]) << 24);
}

extern "C" {
// Reject malformed archives before the upstream decoder sees them.
Engine *rix_create(const uint8_t *data, uint32_t size, uint32_t rate) {
  if (size < 8 || rate < 8000 || rate > 192000) return nullptr;
  uint32_t first = read32(data);
  if (first < 8 || first > size || first % 4 || first > 4096 * 4) return nullptr;
  for (uint32_t p = 0; p < first; p += 4) {
    uint32_t offset = read32(data + p);
    if (offset < first || offset > size || (p && offset < read32(data + p - 4))) return nullptr;
  }
  if (read32(data + first - 4) != size) return nullptr;
  for (uint32_t i = 0; i + 4 < first; i += 4) {
    uint32_t offset = read32(data + i);
    uint32_t length = read32(data + i + 4) - offset;
    if (!length) continue;
    const uint8_t *p = data + offset;
    if (length < 16 || p[0] != 0xaa || p[1] != 0x55) return nullptr;
    uint32_t instruments = p[8] | (uint32_t(p[9]) << 8);
    uint32_t music = p[12] | (uint32_t(p[13]) << 8);
    if (instruments < 16 || music < instruments || music + 1 >= length || p[2] > 1) return nullptr;
    bool terminated = false;
    for (uint32_t position = music + 1; position < length; position += 2) {
      uint8_t control = p[position], operand = p[position - 1];
      if (control == 0x80) { terminated = true; break; }
      uint8_t kind = control & 0xf0, channel = control & 0x0f;
      if (kind >= 0x90 && kind <= 0xc0) {
        if (channel > 8 && (p[2] == 0 || channel > 10)) return nullptr;
        if (kind == 0x90 && instruments + uint32_t(operand) * 64 + 56 > music) return nullptr;
      }
    }
    if (!terminated) return nullptr;
  }
  auto *engine = static_cast<Engine*>(malloc(sizeof(Engine)));
  if (!engine) return nullptr;
  new (engine) Engine(rate);
  engine->offsetCount = first / 4;
  for (uint32_t i = 0; i < engine->offsetCount; ++i) engine->offsets[i] = read32(data + i * 4);
  if (!engine->player.loadMemory(data, size)) { engine->~Engine(); free(engine); return nullptr; }
  return engine;
}

int rix_play(Engine *engine, int track, int loop) {
  if (!engine) return 0;
  engine->loop = loop != 0;
  if (track == engine->track && engine->active) return 1;
  engine->active = false;
  engine->track = track;
  engine->remainingSampleUnits = 0;
  if (track <= 0 || uint32_t(track) >= engine->offsetCount - 1 ||
      engine->offsets[track] == engine->offsets[track + 1]) return 0;
  engine->player.rewind(track);
  engine->active = true;
  return 1;
}

// Stereo PCM float output, with a bounded stack buffer and no per-block allocation.
int rix_render(Engine *engine, float *output, int frames) {
  if (!engine || frames <= 0 || frames > 4096) return 0;
  std::fill(output, output + frames * 2, 0.0f);
  int done = 0;
  short pcm[256 * 2];
  while (engine->active && done < frames) {
    if (engine->remainingSampleUnits <= 0) {
      if (!engine->player.update()) {
        if (!engine->loop) { engine->active = false; break; }
        engine->player.rewindReInit(engine->track, false);
        if (!engine->player.update()) { engine->active = false; break; }
      }
      engine->remainingSampleUnits += engine->rate;
    }
    int count = std::min({frames - done, 256, int((engine->remainingSampleUnits + 69) / 70)});
    engine->opl.update(pcm, count);
    for (int i = 0; i < count * 2; ++i) output[done * 2 + i] = pcm[i] / 32768.0f;
    done += count;
    engine->remainingSampleUnits -= count * 70;
  }
  return engine->active ? 1 : 0;
}

void rix_destroy(Engine *engine) { if (engine) { engine->~Engine(); free(engine); } }
}
