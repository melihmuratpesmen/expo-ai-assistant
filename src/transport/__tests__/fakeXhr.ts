/** Minimal XMLHttpRequest stand-in for driving streamed responses in tests. */
export class FakeXhr {
  static instances: FakeXhr[] = [];

  method = '';
  url = '';
  body: unknown = null;
  headers: Record<string, string> = {};
  status = 0;
  responseText = '';
  responseType = '';
  timeout = 0;
  aborted = false;

  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body: unknown) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
  }

  /** Append streamed text and fire a progress event. */
  push(text: string) {
    this.responseText += text;
    this.onprogress?.();
  }

  /** Complete the request with the given status (and optional extra body). */
  finish(status = 200, body = '') {
    this.status = status;
    this.responseText += body;
    this.onload?.();
  }

  static install() {
    FakeXhr.instances = [];
    (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXhr;
  }

  static latest(): FakeXhr {
    const xhr = FakeXhr.instances[FakeXhr.instances.length - 1];
    if (!xhr) throw new Error('No XMLHttpRequest was created');
    return xhr;
  }
}

/** Let pending promise continuations (e.g. async header resolution) run. */
export function flushAsync() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function sse(...payloads: unknown[]): string {
  return payloads
    .map(p => `data: ${typeof p === 'string' ? p : JSON.stringify(p)}\n\n`)
    .join('');
}
