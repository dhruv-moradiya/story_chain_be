import { SessionJSON, UserJSON } from '@clerk/fastify';
import { ISessionCreateDTO, IUserCreateDTO, SessionCreateDTO, UserCreateDTO } from '@dto/user.dto';
import { singleton } from 'tsyringe';

@singleton()
export class WebhookTransformer {
  transformUserCreated(raw: UserJSON): IUserCreateDTO {
    return UserCreateDTO.parse({
      clerkId: raw.id,
      email: raw.email_addresses[0].email_address,
      username: raw.username,
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

  private buildUserAgent(activity: SessionJSON['latest_activity']) {
    if (!activity) return null;
    const type = activity.device_type ?? (activity.is_mobile === true ? 'Mobile' : 'Unknown');
    const browser =
      `${activity.browser_name ?? 'Unknown'} ${activity.browser_version ?? ''}`.trim();
    const loc = [activity.city, activity.country].filter(Boolean).join(', ');
    return `${browser} (${type})${loc ? ` - ${loc}` : ''} [IP: ${activity.ip_address}]`;
  }
}
