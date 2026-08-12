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

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
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
}): Promise<string> {
  const { url, method = 'GET', headers = {}, body, signal, onChunk, onUnauthorized } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let processedLength = 0;
    let settled = false;

    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const onAbort = () => {
      xhr.abort();
      fail(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort);

    xhr.open(method, url);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.timeout = 300000;
    xhr.responseType = 'text';

    xhr.onprogress = () => {
      const fullText = xhr.responseText ?? '';
      if (fullText.length <= processedLength) return;
      const chunk = fullText.slice(processedLength);
      processedLength = fullText.length;
      onChunk(chunk);
    };

    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status === 401) onUnauthorized?.();
      if (xhr.status >= 200 && xhr.status < 300) {
        const fullText = xhr.responseText ?? '';
        if (fullText.length > processedLength) {
          onChunk(fullText.slice(processedLength));
        }
        settle(fullText);
        return;
      }
      fail(new AiHttpError(`Request failed (${xhr.status})`, xhr.status, xhr.responseText));
    };

    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      fail(new Error('Network error. Please try again.'));
    };

    xhr.ontimeout = () => {
      signal?.removeEventListener('abort', onAbort);
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
      let line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);

      if (!line) continue;
      if (line.startsWith(':')) continue;
      if (line.startsWith('data:')) {
        payloads.push(line.slice(5).replace(/^\s/, ''));
      }
    }

    return payloads;
  }
}
