#include <stdatomic.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    float *samples;
    uint32_t capacity;
    _Atomic uint64_t writeIndex;
    _Atomic uint64_t readIndex;
    _Atomic uint64_t overrunCount;
} MightyAudioRing;

void *MightyAudioRingCreate(uint32_t capacity) {
    if (capacity < 1024 || capacity > 1048576) return NULL;
    MightyAudioRing *ring = calloc(1, sizeof(MightyAudioRing));
    if (!ring) return NULL;
    ring->samples = calloc(capacity, sizeof(float));
    if (!ring->samples) { free(ring); return NULL; }
    ring->capacity = capacity;
    return ring;
}

void MightyAudioRingDestroy(void *opaque) {
    MightyAudioRing *ring = opaque;
    if (!ring) return;
    free(ring->samples);
    free(ring);
}

uint32_t MightyAudioRingPush(void *opaque, const float *source, uint32_t count) {
    MightyAudioRing *ring = opaque;
    if (!ring || !source || !count) return 0;
    uint64_t write = atomic_load_explicit(&ring->writeIndex, memory_order_relaxed);
    uint64_t read = atomic_load_explicit(&ring->readIndex, memory_order_acquire);
    uint32_t freeCount = ring->capacity - (uint32_t)(write - read);
    uint32_t accepted = count < freeCount ? count : freeCount;
    uint32_t offset = (uint32_t)(write % ring->capacity);
    uint32_t first = accepted < ring->capacity - offset ? accepted : ring->capacity - offset;
    memcpy(ring->samples + offset, source, first * sizeof(float));
    memcpy(ring->samples, source + first, (accepted - first) * sizeof(float));
    atomic_store_explicit(&ring->writeIndex, write + accepted, memory_order_release);
    if (accepted < count) atomic_fetch_add_explicit(&ring->overrunCount, count - accepted, memory_order_relaxed);
    return accepted;
}

uint32_t MightyAudioRingPop(void *opaque, float *destination, uint32_t maximum) {
    MightyAudioRing *ring = opaque;
    if (!ring || !destination || !maximum) return 0;
    uint64_t read = atomic_load_explicit(&ring->readIndex, memory_order_relaxed);
    uint64_t write = atomic_load_explicit(&ring->writeIndex, memory_order_acquire);
    uint32_t available = (uint32_t)(write - read);
    uint32_t count = maximum < available ? maximum : available;
    uint32_t offset = (uint32_t)(read % ring->capacity);
    uint32_t first = count < ring->capacity - offset ? count : ring->capacity - offset;
    memcpy(destination, ring->samples + offset, first * sizeof(float));
    memcpy(destination + first, ring->samples, (count - first) * sizeof(float));
    atomic_store_explicit(&ring->readIndex, read + count, memory_order_release);
    return count;
}

uint64_t MightyAudioRingOverruns(void *opaque) {
    MightyAudioRing *ring = opaque;
    return ring ? atomic_load_explicit(&ring->overrunCount, memory_order_relaxed) : 0;
}
