#include <cstdio>
#include <cstdlib>
#include <vector>
#include "adplug/rix.h"
#include "adplug/nuked/opl3.c.h"
class GoldenOpl: public Copl {
  opl3_chip chip{};
public:
  unsigned rate;
  GoldenOpl(unsigned rate): rate(rate) {}
  void init() override { OPL3_Reset(&chip, rate); }
  void write(int reg, int val) override { OPL3_WriteRegBuffered(&chip, reg, val); }
  void update(short *buffer, int samples) override { OPL3_GenerateStream(&chip, buffer, samples); }
};
int main(int argc,char **argv) {
  if(argc!=4)return 2;
  unsigned rate=std::atoi(argv[2]);bool loop=std::atoi(argv[3]);
  GoldenOpl opl(rate);CrixPlayer player(&opl);
  if(!player.load(argv[1],CProvider_Filesystem()))return 3;
  player.rewind(1);std::vector<float> out(rate*4,0);std::vector<short> pcm(2048);
  unsigned done=0, tick=0;bool active=true;
  while(done<rate*2 && active){
    if(!player.update()) { if(!loop)break;player.rewindReInit(1,false);if(!player.update())break; }
    // Independent absolute rational deadlines, rather than bridge block accounting.
    unsigned end=std::min(rate*2,unsigned((uint64_t(++tick)*rate+69)/70));
    while(done<end){unsigned n=std::min(end-done,1024u);opl.update(pcm.data(),n);
      for(unsigned i=0;i<n*2;i++)out[done*2+i]=pcm[i]/32768.0f;done+=n;
    }
  }
  fwrite(out.data(),sizeof(float),out.size(),stdout);
}
