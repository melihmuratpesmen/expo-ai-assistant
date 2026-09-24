export class AiHttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'AiHttpError';
    this.status = status;
    this.body = body;
  }
}

export function createAbortError(): Error {
  return Object.assign(new Error('Aborted'), { name: 'AbortError' });
}

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Best-effort human-readable message from an error response body
 * (OpenAI-style `{ error: { message } }` and common variants).
 */
export function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body !== 'string') return undefined;
  const text = body.trim();
  if (!text) return undefined;

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const error = json.error as { message?: unknown } | string | undefined;
    const candidate =
      (typeof error === 'object' && error !== null ? error.message : undefined) ??
      (typeof error === 'string' ? error : undefined) ??
      json.message ??
      json.detail;
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
  } catch {
    // Short plain-text bodies are shown as-is; HTML error pages are not.
    if (text.length <= 200 && !text.startsWith('<')) return text;
    return undefined;
  }
}

export async function resolveBearerHeaders(options: {
  apiKey?: () => Promise<string | null> | string | null;
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(await options.getHeaders?.()),
  };
  const key = options.apiKey ? await options.apiKey() : null;
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

/** RN-friendly SSE via XHR download progress. */
export function subscribeSseText(options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  onUnauthorized?: () => void;
  /** Request timeout in ms. Default 300000 (5 min). */
  timeoutMs?: number;
}): Promise<string> {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    signal,
    onChunk,
    onUnauthorized,
    timeoutMs = 300000,
  } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    let processedLength = 0;
    let settled = false;

    const cleanup = () => signal?.removeEventListener('abort', onAbort);

    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    function onAbort() {
      xhr.abort();
      fail(createAbortError());
    }
    signal?.addEventListener('abort', onAbort);

    xhr.open(method, url);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.timeout = timeoutMs;
    xhr.responseType = 'text';

    xhr.onprogress = () => {
      if (settled) return;
      const fullText = xhr.responseText ?? '';
      if (fullText.length <= processedLength) return;
      const chunk = fullText.slice(processedLength);
      processedLength = fullText.length;
      onChunk(chunk);
    };

    xhr.onload = () => {
      if (settled) return;
      if (xhr.status === 401) onUnauthorized?.();
      if (xhr.status >= 200 && xhr.status < 300) {
        const fullText = xhr.responseText ?? '';
        if (fullText.length > processedLength) {
          onChunk(fullText.slice(processedLength));
        }
        settle(fullText);
        return;
      }
      const message = extractErrorMessage(xhr.responseText) ?? `Request failed (${xhr.status})`;
      fail(new AiHttpError(message, xhr.status, xhr.responseText));
    };

    xhr.onerror = () => {
      fail(new Error('Network error. Please try again.'));
    };

    xhr.ontimeout = () => {
      fail(new Error('Request timed out.'));
    };

    xhr.send(body ?? null);
  });
}

/** Minimal SSE line parser (data: … events). */
export class SseDataParser {
  private buffer = '';

  feed(chunk: string): string[] {
    this.buffer += chunk;
    const payloads: string[] = [];

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      const payload = parseDataLine(line);
      if (payload !== null) payloads.push(payload);
    }

    return payloads;
  }

  /** Emit a trailing line the stream ended without terminating. */
  flush(): string[] {
    const line = this.buffer;
    this.buffer = '';
    const payload = parseDataLine(line);
    return payload !== null ? [payload] : [];
  }
}

function parseDataLine(rawLine: string): string | null {
  const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
  if (!line || line.startsWith(':')) return null;
  if (!line.startsWith('data:')) return null;
  return line.slice(5).replace(/^\s/, '');
}
