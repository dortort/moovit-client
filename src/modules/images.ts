import type { Page } from 'puppeteer';
import { ResolvedConfig } from '../types';
import { ApiError } from '../errors';
import { buildHeaders } from '../utils/headers';

const API_BASE = 'https://moovitapp.com/api';

export interface TransitImage {
  id: number;
  data: string;
  mimeType: string;
}

export class ImagesService {
  private cache: Map<number, TransitImage> = new Map();

  constructor(private config: ResolvedConfig, private page: Page) {}

  async getImages(ids: number[]): Promise<TransitImage[]> {
    const uncachedIds = ids.filter((id) => !this.cache.has(id));

    if (uncachedIds.length === 0) {
      return ids.map((id) => this.cache.get(id)!);
    }

    const url = `${API_BASE}/image?ids=${uncachedIds.join(',')}`;
    const headers = buildHeaders(this.config);

    const response = await this.page.evaluate(
      async (fetchUrl: string, fetchHeaders: Record<string, string>) => {
        const res = await fetch(fetchUrl, { headers: fetchHeaders, credentials: 'include' });
        if (!res.ok) return { error: true, status: res.status };
        return { error: false, data: await res.json() };
      },
      url, headers
    );

    if (response.error) throw new ApiError((response as { status: number }).status, '/image');

    const images = this.parseImagesResponse((response as { data: unknown }).data);
    for (const image of images) this.cache.set(image.id, image);

    return ids.map((id) => this.cache.get(id)).filter((img): img is TransitImage => img !== undefined);
  }

  async getImage(id: number): Promise<TransitImage | null> {
    const images = await this.getImages([id]);
    return images.length > 0 ? images[0] : null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private parseImagesResponse(data: unknown): TransitImage[] {
    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      const r = item as {
        id?: number; imageData?: string; mimeType?: string;
        entity?: { image?: { imageId?: number; imageData?: string; imageType?: number } };
      };

      if (r.entity?.image) {
        return {
          id: r.entity.image.imageId || 0,
          data: r.entity.image.imageData || '',
          mimeType: this.getMimeType(r.entity.image.imageType),
        };
      }

      return { id: r.id || 0, data: r.imageData || '', mimeType: r.mimeType || 'image/png' };
    });
  }

  private getMimeType(imageType?: number): string {
    switch (imageType) {
      case 1: return 'image/png';
      case 2: return 'image/jpeg';
      case 3: return 'image/gif';
      case 4: return 'image/svg+xml';
      default: return 'image/png';
    }
  }
}
