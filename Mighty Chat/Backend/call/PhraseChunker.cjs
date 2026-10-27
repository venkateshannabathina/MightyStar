'use strict';

const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'e.g', 'i.e']);

class PhraseChunker {
  constructor({ maxPending = 2000, maxPhrase = 180, timedAfterMs = 350, firstPhraseFast = false } = {}) {
    this.pending = '';
    this.firstPhraseFast = firstPhraseFast;
    this.maxPending = maxPending;
    this.maxPhrase = maxPhrase;
    this.timedAfterMs = timedAfterMs;
    this.nextIndex = 0;
    this.lastEmitAt = 0;
    this.finished = false;
  }

  push(delta, now = Date.now(), final = false) {
    if (this.finished) throw new Error('Phrase stream is already finished.');
    if (typeof delta !== 'string') throw new TypeError('Phrase delta must be text.');
    if (this.pending.length + delta.length > this.maxPending) throw new Error('Phrase queue limit exceeded.');
    this.pending += delta;
    const output = [];
    while (this.pending.trim()) {
      const boundary = this.findBoundary(final, now);
      if (boundary <= 0) break;
      const phrase = this.pending.slice(0, boundary).trim();
      this.pending = this.pending.slice(boundary).trimStart();
      if (phrase) {
        output.push({ index: this.nextIndex++, text: phrase });
        this.lastEmitAt = now;
      }
    }
    if (final) this.finished = true;
    return output;
  }

  findBoundary(final, now) {
    const text = this.pending;
    const maximum = Math.min(text.length, this.maxPhrase);
    let firstBoundary = 0;
    // Only the first spoken phrase changes; sentence probes/parser retain their rules.
    if (this.firstPhraseFast && this.nextIndex === 0) {
      const clause = /,(?=\s)|—|–(?=\s)|\s-(?=\s)/g;
      for (const match of text.matchAll(clause)) {
        if (match.index >= 1 && match.index < maximum) { firstBoundary = match.index + match[0].length; break; }
      }
      if (text.length >= 25) {
        const space = text.indexOf(' ', 24);
        if (space >= 24 && space < maximum) firstBoundary = firstBoundary ? Math.min(firstBoundary,space) : space;
      }
    }
    for (let index = 0; index < maximum; index++) {
      const char = text[index];
      if (!'.!?;:'.includes(char)) continue;
      const next = text[index + 1];
      if (next && !/\s/.test(next)) continue;
      if (char === '.') {
        const before = text.slice(0, index);
        const token = before.match(/([A-Za-z]+(?:\.[A-Za-z]+)?)$/)?.[1]?.toLowerCase();
        if (token && ABBREVIATIONS.has(token)) continue;
        if (/\d$/.test(before) && /^\d/.test(next || '')) continue;
        if (token?.length === 1 && /(?:^|\s)[A-Z]$/.test(before)) continue;
      }
      if (next || final) return firstBoundary ? Math.min(firstBoundary,index + 1) : index + 1;
    }
    if (firstBoundary) return firstBoundary;
    if (text.length >= this.maxPhrase) {
      const slice = text.slice(0, this.maxPhrase + 1);
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace < 24) throw new Error('A word exceeds the phrase length limit.');
      return lastSpace;
    }
    const enoughWords = (text.match(/\S+/g) || []).length >= 6;
    if (enoughWords && now - this.lastEmitAt >= this.timedAfterMs) {
      const comma = text.lastIndexOf(', ');
      if (comma >= 20) return comma + 1;
      const lastSpace = text.lastIndexOf(' ');
      if (lastSpace >= 20) return lastSpace;
    }
    return final ? text.length : 0;
  }
}

module.exports = { PhraseChunker };
