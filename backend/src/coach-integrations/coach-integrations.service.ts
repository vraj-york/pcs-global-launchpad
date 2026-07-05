import { Injectable } from '@nestjs/common';

const DEFAULT_INTEGRATIONS = [
  {
    provider: 'outlook',
    connected: false,
    accountEmail: null,
    message: 'OAuth integration not configured in local dev.',
  },
  {
    provider: 'zoom',
    connected: false,
    accountEmail: null,
    message: 'OAuth integration not configured in local dev.',
  },
] as const;

@Injectable()
export class CoachIntegrationsService {
  async list() {
    return DEFAULT_INTEGRATIONS;
  }

  async connect(provider: string) {
    return {
      provider,
      connected: false,
      oauthConfigured: false,
      message: 'OAuth integration not configured in local dev.',
    };
  }

  async callback(provider: string) {
    return {
      provider,
      connected: false,
      oauthConfigured: false,
      message: 'OAuth integration not configured in local dev.',
    };
  }

  async disconnect(provider: string) {
    return {
      provider,
      disconnected: true,
      message: 'OAuth integration not configured in local dev.',
    };
  }
}
