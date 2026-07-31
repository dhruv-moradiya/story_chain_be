// ─── Ban Type ─────────────────────────────────────────────────────────────────

export enum BanType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
}

export const BAN_TYPES = [BanType.TEMPORARY, BanType.PERMANENT] as const;
