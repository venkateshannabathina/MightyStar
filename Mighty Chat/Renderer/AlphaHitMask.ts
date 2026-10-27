/** Samples the displayed canvas after rendering. This never changes its pixels,
 * resolution, materials, antialiasing, or animation. Packed rows run top-to-bottom. */
export class AlphaHitMask {
    private readonly surface = document.createElement('canvas');
    private readonly context = this.surface.getContext('2d', {willReadFrequently:true})!;
    private lastSample = 0;
    private bits = new Uint8Array(0);
    private previousBits = new Uint8Array(0);
    private lastData = '';
    private lastSent = 0;

    sample(canvas: HTMLCanvasElement, now: number): void {
        if (now - this.lastSample < 1000 / 30) return;
        this.lastSample = now;
        const scale = Math.min(1, 512 / Math.max(1, canvas.clientWidth), 1024 / Math.max(1, canvas.clientHeight));
        const width = Math.max(1, Math.ceil(canvas.clientWidth * scale));
        const height = Math.max(1, Math.ceil(canvas.clientHeight * scale));
        const byteCount = Math.ceil(width * height / 8);
        const resized = this.surface.width !== width || this.surface.height !== height || this.bits.length !== byteCount;
        if (resized) {
            this.surface.width = width; this.surface.height = height;
            this.bits = new Uint8Array(byteCount);
            this.previousBits = new Uint8Array(byteCount);
        }
        this.context.clearRect(0, 0, width, height);
        this.context.drawImage(canvas, 0, 0, width, height);
        const rgba = this.context.getImageData(0, 0, width, height).data;
        const bits = this.bits;
        bits.fill(0);
        for (let i = 0; i < width * height; i++) {
            if (rgba[i * 4 + 3] >= 16) bits[i >> 3] |= 1 << (i & 7);
        }
        let changed = resized;
        for (let i = 0; !changed && i < bits.length; i++) changed = bits[i] !== this.previousBits[i];
        if (changed) {
            let binary = '';
            for (let i = 0; i < bits.length; i += 8192) binary += String.fromCharCode(...bits.subarray(i, i + 8192));
            this.lastData = btoa(binary);
            this.previousBits.set(bits);
        }
        // Keep the native heartbeat, but encode only when the silhouette changes.
        if (!changed && now - this.lastSent < 500) return;
        this.lastSent = now;
        window.parent.postMessage({type:'mighty-companion-hit-mask',width,height,data:this.lastData,viewportWidth:canvas.clientWidth,viewportHeight:canvas.clientHeight}, '*');
    }
}
