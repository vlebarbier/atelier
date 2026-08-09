// Client HTTP vers l'API Atelier (Hono).
// Toutes les erreurs réseau/HTTP sont normalisées en Error avec message lisible.

const DEFAULT_API_URL = 'http://localhost:4310';

export interface ClientOptions {
  apiUrl?: string;
}

export class AtelierApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AtelierApiError';
  }
}

export class AtelierClient {
  private base: string;

  constructor(opts: ClientOptions = {}) {
    this.base = (opts.apiUrl || process.env.ATELIER_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
  }

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
      });
    } catch (e) {
      throw new AtelierApiError(
        `API Atelier injoignable (${this.base}) : ${e instanceof Error ? e.message : e}`
      );
    }
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const detail =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: unknown }).error)
          : text.slice(0, 200);
      throw new AtelierApiError(`API Atelier ${res.status} : ${detail}`, res.status);
    }
    return data;
  }

  /** GET /api/brouillons → liste des brouillons. */
  async listeBrouillons(): Promise<unknown> {
    return this.request('/api/brouillons');
  }

  /** GET /api/brouillon/:id → détail complet. */
  async lireBrouillon(id: string): Promise<unknown> {
    return this.request(`/api/brouillon/${encodeURIComponent(id)}`);
  }

  /** POST /api/brouillon/:id {statut} */
  async setStatut(id: string, statut: string): Promise<unknown> {
    return this.request(`/api/brouillon/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ statut })
    });
  }

  /** POST /api/brouillon/:id {notes} */
  async setNotes(id: string, notes: string): Promise<unknown> {
    return this.request(`/api/brouillon/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  /** POST /api/brouillon/:id {sourceHtml} — dépose la source HTML du document. */
  async setSource(id: string, sourceHtml: string): Promise<unknown> {
    return this.request(`/api/brouillon/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ sourceHtml })
    });
  }

  /** POST /api/brouillon/:id {reseaux:{reseau:{caption,hashtags}}} */
  async setLegende(id: string, reseau: string, caption: string, hashtags: string): Promise<unknown> {
    return this.request(`/api/brouillon/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ reseaux: { [reseau]: { caption, hashtags } } })
    });
  }
}
