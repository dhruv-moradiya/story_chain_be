import { logger } from '@/utils/logger';
import { SessionJSON, UserJSON } from '@clerk/fastify';
import {
  ISessionCreateDTO,
  IUserCreateDTO,
  IUserUpdateDTO,
  IConnectedAccount,
} from '@dto/user.dto';
import { SessionCreateDTO, UserCreateDTO, UserUpdateDTO } from '@schema/request/user.schema';
import { singleton } from 'tsyringe';

@singleton()
export class WebhookTransformer {
  transformUserCreated(raw: UserJSON): IUserCreateDTO {
    const externalAccounts = raw.external_accounts ?? [];
    const primaryOAuth = externalAccounts[0]; // First OAuth account is typically primary

    // Determine auth provider
    const authProvider = this.determineAuthProvider(externalAccounts);

    // Generate username if not provided (common with OAuth)
    const username = this.resolveUsername(raw, primaryOAuth);

    // Get best available avatar URL
    const avatarUrl = this.resolveAvatarUrl(raw, primaryOAuth);

    // Transform connected accounts
    const connectedAccounts = this.transformExternalAccounts(externalAccounts);

    // Check if email is verified
    const emailVerified = raw.email_addresses.some(
      (e) => e.id === raw.primary_email_address_id && e.verification?.status === 'verified'
    );

    logger.info(`[WEBHOOK] USER CREATED: Provider=${authProvider}, Username=${username}`);

    return UserCreateDTO.parse({
      clerkId: raw.id,
      email: raw.email_addresses[0]?.email_address,
      username,
      avatarUrl,
      authProvider,
      primaryAuthMethod: authProvider,
      connectedAccounts,
      emailVerified,
      firstName: raw.first_name ?? undefined,
      lastName: raw.last_name ?? undefined,
    });
  }

  transformUserUpdated(raw: UserJSON): IUserUpdateDTO {
    const externalAccounts = raw.external_accounts ?? [];

    return UserUpdateDTO.parse({
      clerkId: raw.id,
      email: raw.email_addresses[0]?.email_address,
      username: raw.username ?? undefined,
      avatarUrl: raw.image_url,
      connectedAccounts: this.transformExternalAccounts(externalAccounts),
      emailVerified: raw.email_addresses.some(
        (e) => e.id === raw.primary_email_address_id && e.verification?.status === 'verified'
      ),
    });
  }

  transformSessionCreated(raw: SessionJSON): ISessionCreateDTO {
    return SessionCreateDTO.parse({
      sessionId: raw.id,
      userId: raw.user_id,
      clientId: raw.client_id,
      createdAt: new Date(raw.created_at * 1000),
      lastActiveAt: new Date(raw.last_active_at * 1000),
      ip: raw.latest_activity?.ip_address ?? null,
      userAgent: this.buildUserAgent(raw.latest_activity),
    });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private determineAuthProvider(externalAccounts: UserJSON['external_accounts']): string {
    if (!externalAccounts || externalAccounts.length === 0) {
      return 'email';
    }

    const provider = externalAccounts[0].provider;

    if (provider.includes('google')) return 'google';
    if (provider.includes('github')) return 'github';
    if (provider.includes('discord')) return 'discord';
    return 'email';
  }

  private resolveUsername(raw: UserJSON, primaryOAuth?: UserJSON['external_accounts'][0]): string {
    // 1. Use Clerk username if available
    if (raw.username) {
      return raw.username;
    }

    // 2. Use GitHub username if signing up with GitHub
    if (primaryOAuth?.provider?.includes('github') && primaryOAuth.username) {
      return primaryOAuth.username;
    }

    // 3. Generate from name
    if (raw.first_name || raw.last_name) {
      const nameBased = `${raw.first_name ?? ''}${raw.last_name ?? ''}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (nameBased.length >= 3) {
        return nameBased + Math.floor(Math.random() * 1000);
      }
    }

    // 4. Generate from email prefix
    const emailPrefix = raw.email_addresses[0]?.email_address?.split('@')[0] ?? '';
    const sanitized = emailPrefix.replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (sanitized.length >= 3) {
      return sanitized + Math.floor(Math.random() * 1000);
    }

    // 5. Fallback: generate random username
    return `user_${Date.now().toString(36)}`;
  }

  private resolveAvatarUrl(raw: UserJSON, primaryOAuth?: UserJSON['external_accounts'][0]): string {
    // Clerk's image_url is usually the best (synced from OAuth or uploaded)
    if (raw.image_url && !raw.image_url.includes('default')) {
      return raw.image_url;
    }

    // Fall back to OAuth provider avatar
    type CustomExternalAccountJSON = UserJSON['external_accounts'][0] & {
      avatar_url?: string;
    };
    const acc = primaryOAuth as CustomExternalAccountJSON | undefined;
    if (acc?.avatar_url) {
      return acc.avatar_url;
    }

    return '';
  }

  private transformExternalAccounts(
    externalAccounts: UserJSON['external_accounts']
  ): IConnectedAccount[] {
    if (!externalAccounts) return [];

    return externalAccounts
      .filter((account) => {
        const p = account.provider;
        return p.includes('google') || p.includes('github') || p.includes('discord');
      })
      .map((account) => {
        const acc = account as unknown as { avatar_url?: string };
        return {
          provider: this.normalizeProvider(account.provider),
          providerAccountId: account.provider_user_id,
          email: account.email_address,
          username: account.username ?? undefined,
          avatarUrl: acc.avatar_url ?? undefined,
          connectedAt: new Date(),
        };
      });
  }

  private normalizeProvider(clerkProvider: string): 'google' | 'github' | 'discord' {
    if (clerkProvider.includes('google')) return 'google';
    if (clerkProvider.includes('github')) return 'github';
    if (clerkProvider.includes('discord')) return 'discord';
    return 'google'; // fallback, though filtered out above
  }

  private buildUserAgent(activity: SessionJSON['latest_activity']) {
    if (!activity) return null;
    const type = activity.device_type ?? (activity.is_mobile === true ? 'Mobile' : 'Unknown');
    const browser =
      `${activity.browser_name ?? 'Unknown'} ${activity.browser_version ?? ''}`.trim();
    const loc = [activity.city, activity.country].filter(Boolean).join(', ');
    return `${browser} (${type})${loc ? ` - ${loc}` : ''} [IP: ${activity.ip_address}]`;
  }
}
