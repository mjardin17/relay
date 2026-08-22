import http from 'http';
import https from 'https';

export class ZeroNetworkGuard {
  private isActive = false;
  private originalFetch: typeof globalThis.fetch | null = null;
  private originalHttpRequest: typeof http.request | null = null;
  private originalHttpsRequest: typeof https.request | null = null;
  private scopedAllowedHosts: Set<string> = new Set();

  public registerScopedOutboundHost(host: string): void {
    if (host) {
      this.scopedAllowedHosts.add(host.toLowerCase());
    }
  }

  public unregisterScopedOutboundHost(host: string): void {
    if (host) {
      this.scopedAllowedHosts.delete(host.toLowerCase());
    }
  }

  public activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    // 1. Guard global fetch
    if (typeof globalThis.fetch === 'function') {
      this.originalFetch = globalThis.fetch;
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (!this.isAllowedLocalUrl(urlStr)) {
          throw new Error(
            `ZERO_NETWORK_GUARD_BLOCKED: Outbound external network request to '${urlStr}' blocked in DRY_RUN mode.`
          );
        }
        return this.originalFetch!(input, init);
      };
    }

    // 2. Guard Node http.request
    this.originalHttpRequest = http.request;
    http.request = ((...args: any[]) => {
      const host = this.extractHostFromHttpArgs(args);
      if (!this.isAllowedLocalHost(host)) {
        throw new Error(
          `ZERO_NETWORK_GUARD_BLOCKED: Outbound HTTP request to '${host}' blocked in DRY_RUN mode.`
        );
      }
      return this.originalHttpRequest!.apply(http, args as any);
    }) as any;

    // 3. Guard Node https.request
    this.originalHttpsRequest = https.request;
    https.request = ((...args: any[]) => {
      const host = this.extractHostFromHttpArgs(args);
      if (!this.isAllowedLocalHost(host)) {
        throw new Error(
          `ZERO_NETWORK_GUARD_BLOCKED: Outbound HTTPS request to '${host}' blocked in DRY_RUN mode.`
        );
      }
      return this.originalHttpsRequest!.apply(https, args as any);
    }) as any;

    console.log('[ZeroNetworkGuard] Fail-closed zero network outbound containment active.');
  }

  public isAllowedLocalUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      return this.isAllowedLocalHost(parsed.hostname);
    } catch {
      return false;
    }
  }

  public isAllowedLocalHost(host: string): boolean {
    if (!host) return false;
    const cleanHost = host.split(':')[0].toLowerCase();
    if (
      cleanHost === 'localhost' ||
      cleanHost === '127.0.0.1' ||
      cleanHost === '0.0.0.0' ||
      cleanHost === '::1'
    ) {
      return true;
    }
    return this.scopedAllowedHosts.has(cleanHost);
  }

  private extractHostFromHttpArgs(args: any[]): string {
    const first = args[0];
    if (typeof first === 'string') {
      try {
        return new URL(first).hostname;
      } catch {
        return first;
      }
    }
    if (first && typeof first === 'object') {
      if (first instanceof URL) return first.hostname;
      return first.hostname || first.host || '';
    }
    return '';
  }

  public getStatus() {
    return {
      active: this.isActive,
      mode: 'ZERO_NETWORK_FAIL_CLOSED',
      externalEgressBlocked: true,
      allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', '::1'],
    };
  }
}

export const zeroNetworkGuard = new ZeroNetworkGuard();
