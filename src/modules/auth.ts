import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer';
import { AuthenticationError, TokenExpiredError } from '../errors';
import { ResolvedConfig } from '../types/config';
import { sleep } from '../utils/polling';

/**
 * WAF Token Manager
 * Handles acquiring and refreshing AWS WAF tokens via Puppeteer
 */
export class AuthManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lastTokenTime = 0;

  constructor(private config: ResolvedConfig) {}

  /**
   * Initialize the browser and acquire the initial WAF token
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        ...this.config.puppeteerOptions,
      });

      this.page = await this.browser.newPage();

      // Set viewport and user agent
      await this.page.setViewport({ width: 1280, height: 800 });
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Acquire initial token
      await this.acquireToken();

      // Start refresh timer
      this.startRefreshTimer();

      this.isInitialized = true;

      if (this.config.debug) {
        console.log('[MoovitClient] Authentication initialized');
      }
    } catch (error) {
      await this.close();
      throw new AuthenticationError(
        `Failed to initialize authentication: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get the Puppeteer page for making API requests
   */
  getPage(): Page {
    if (!this.page) {
      throw new AuthenticationError('Auth manager not initialized');
    }
    return this.page;
  }

  /**
   * Check if token needs refresh
   */
  isTokenStale(): boolean {
    const elapsed = Date.now() - this.lastTokenTime;
    return elapsed >= this.config.tokenRefreshInterval;
  }

  /**
   * Manually refresh the token if needed
   */
  async refreshIfNeeded(): Promise<void> {
    if (this.isTokenStale()) {
      await this.acquireToken();
    }
  }

  /**
   * Close the browser and clean up resources
   */
  async close(): Promise<void> {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    this.isInitialized = false;

    if (this.config.debug) {
      console.log('[MoovitClient] Authentication closed');
    }
  }

  /**
   * Acquire WAF token by navigating to Moovit website
   */
  private async acquireToken(): Promise<void> {
    if (!this.page) {
      throw new AuthenticationError('Page not initialized');
    }

    try {
      if (this.config.debug) {
        console.log('[MoovitClient] Acquiring WAF token...');
      }

      // Navigate to Moovit with the configured metro
      const url = `https://moovitapp.com/israel-1/poi/en`;
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for WAF challenge to complete
      await sleep(3000);

      // Verify we have the WAF token cookie
      const cookies = await this.page.cookies();
      const wafCookie = cookies.find((c) => c.name === 'aws-waf-token');

      if (!wafCookie) {
        // Try waiting a bit longer for the challenge
        await sleep(5000);
        const retryCookes = await this.page.cookies();
        const retryWafCookie = retryCookes.find((c) => c.name === 'aws-waf-token');

        if (!retryWafCookie) {
          if (this.config.debug) {
            console.log('[MoovitClient] Available cookies:', cookies.map((c) => c.name));
          }
          throw new AuthenticationError('WAF token cookie not found');
        }
      }

      this.lastTokenTime = Date.now();

      if (this.config.debug) {
        console.log('[MoovitClient] WAF token acquired successfully');
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Failed to acquire WAF token: ${(error as Error).message}`
      );
    }
  }

  /**
   * Start the automatic token refresh timer
   */
  private startRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Refresh slightly before expiration (80% of interval)
    const refreshInterval = Math.floor(this.config.tokenRefreshInterval * 0.8);

    this.tokenRefreshTimer = setInterval(async () => {
      try {
        await this.acquireToken();
      } catch (error) {
        if (this.config.debug) {
          console.error('[MoovitClient] Token refresh failed:', (error as Error).message);
        }
      }
    }, refreshInterval);

    // Unref the timer so it doesn't prevent process exit
    this.tokenRefreshTimer.unref();
  }
}

/**
 * Create default configuration with sensible defaults
 */
export function resolveConfig(config: Partial<ResolvedConfig>): ResolvedConfig {
  // Generate random user key if not provided
  const userKey = config.userKey || generateUserKey();

  return {
    metroId: config.metroId ?? 1,
    language: config.language ?? 'EN',
    userKey,
    customerId: config.customerId ?? '4908',
    puppeteerOptions: config.puppeteerOptions ?? {},
    tokenRefreshInterval: config.tokenRefreshInterval ?? 300000, // 5 minutes
    defaultLat: config.defaultLat ?? 32.0853, // Tel Aviv
    defaultLon: config.defaultLon ?? 34.7818,
    debug: config.debug ?? false,
  };
}

/**
 * Generate a random user key
 */
function generateUserKey(): string {
  const chars = 'ABCDEF0123456789';
  let key = '';
  for (let i = 0; i < 6; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
