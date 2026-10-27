/* Minimal ring control shared by the desktop and docked companion. */
class ParticleOrb {
  constructor(button) {
    this.button = button;
    this.state = 'idle';
    button.dataset.open = 'false';
    button.dataset.held = 'false';
    const ring = document.createElement('span');
    ring.className = 'orb-ring';
    ring.setAttribute('aria-hidden', 'true');
    const dots = document.createElement('span');
    dots.className = 'orb-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i=0; i<3; i++) dots.appendChild(document.createElement('i'));
    button.replaceChildren(ring, dots);
    button.addEventListener('pointerdown', e => {
      if(e.button === 0) button.dataset.held = 'true';
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture','blur']) {
      button.addEventListener(event, () => button.dataset.held = 'false');
    }
    this.setState('idle');
  }
  setName(name) { this.name = name; this.setState(this.state); }
  expand() {
    if(this.button.dataset.open === 'true') return false;
    this.button.dataset.open = 'true';
    return true;
  }
  collapse() { this.button.dataset.open = 'false'; }
  setState(state) {
    this.state = ['idle','listening','thinking','speaking','error'].includes(state) ? state : 'idle';
    this.button.dataset.state = this.state;
    this.button.setAttribute('aria-label', `Companion control · ${this.state}. Click to expand or show views${this.button.id === 'orb' ? '; hold and drag to move' : ''}.`);
  }
  speech(kind, value) {
    if(kind === 'orb') this.setState(value.state);
    if(kind === 'playback') this.setState(value.state === 'speaking' ? 'speaking' : value.state === 'error' ? 'error' : this.state === 'error' ? 'error' : 'idle');
  }
}
window.ParticleOrb = ParticleOrb;
