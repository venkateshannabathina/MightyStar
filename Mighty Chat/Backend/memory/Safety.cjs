'use strict';
const PRIVATE = /(?:^\s*private(?:\s+(?:note|message|information))?\s*:|\[private\]|\b(?:keep (?:this|it) private|this is private|off the record|do not (?:remember|store|save)|don't (?:remember|store|save)|forget this)\b)/i;
class Safety {
  constructor(secrets = Object.entries(process.env).filter(([key]) => /(?:API_KEY)$/.test(key)).map(([,value]) => value)) { this.secrets = secrets.filter(value => typeof value === 'string' && value.length >= 8); }
  redact(value) {
    let text = typeof value === 'string' ? value : '';
    for (const secret of this.secrets) text = text.split(secret).join('[redacted]');
    return text.replace(/\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{12,}|gsk_[A-Za-z0-9]{12,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g, '[redacted]')
      .replace(/\b(?:password|passcode|api[ _-]?key|secret|access token|bearer)\s*(?:is\s+|[:=]\s*|\s+)[^\r\n]*/gi, '[redacted]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b|\b(?:\d[ -]?){12,19}\b/g, '[redacted]')
      .replace(/\b(?:passport|government id|national id|social security|ssn|driver(?:'s)? licen[cs]e|tax id|credit card|debit card)\s*(?:number\s*)?(?:is\s*|[:=]\s*)?[A-Za-z0-9 -]{4,40}/gi, '[redacted]');
  }
  private(value) { return PRIVATE.test(String(value || '')); }
  fact(value) { const text = String(value || '').trim(); return text && text.length <= 600 && !this.private(text) && this.redact(text) === text ? text : null; }
}
module.exports = { Safety };
