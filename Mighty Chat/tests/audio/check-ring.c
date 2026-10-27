#include <assert.h>
#include <stdint.h>
#include <stdio.h>

void *MightyAudioRingCreate(uint32_t capacity);
void MightyAudioRingDestroy(void *ring);
uint32_t MightyAudioRingPush(void *ring, const float *source, uint32_t count);
uint32_t MightyAudioRingPop(void *ring, float *destination, uint32_t count);
uint64_t MightyAudioRingOverruns(void *ring);

int main(void) {
    void *ring = MightyAudioRingCreate(1024);
    assert(ring);
    float source[1200], received[1200];
    for (int index = 0; index < 1200; index++) source[index] = (float)index;
    assert(MightyAudioRingPush(ring, source, 900) == 900);
    assert(MightyAudioRingPop(ring, received, 850) == 850);
    for (int index = 0; index < 850; index++) assert(received[index] == (float)index);
    assert(MightyAudioRingPush(ring, source + 900, 300) == 300);
    assert(MightyAudioRingPop(ring, received, 350) == 350);
    for (int index = 0; index < 350; index++) assert(received[index] == (float)(index + 850));
    assert(MightyAudioRingPush(ring, source, 1200) == 1024);
    assert(MightyAudioRingOverruns(ring) == 176);
    assert(MightyAudioRingPop(ring, received, 1200) == 1024);
    MightyAudioRingDestroy(ring);
    puts("Audio ring wraparound and bounded overrun checks passed");
    return 0;
}
