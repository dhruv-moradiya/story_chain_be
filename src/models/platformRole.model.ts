import mongoose, { Schema } from 'mongoose';
import { IPlatformRoleDoc } from '@features/platformRole/types/platformRole.types';

const platformRoleSchema = new Schema<IPlatformRoleDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'PLATFORM_MODERATOR', 'APPEAL_MODERATOR', 'USER'],
      default: 'USER',
      index: true,
    },
    assignedBy: String,
    assignedAt: Date,
  },
  { timestamps: true }
);

// Ensure only one SUPER_ADMIN can exist at the DB level by using a partial
// unique index on the `role` field for value 'SUPER_ADMIN'. This lets the
// application keep using transactions but guarantees uniqueness under
// concurrent signups.
platformRoleSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: 'SUPER_ADMIN' } }
);

export const PlatformRole = mongoose.model<IPlatformRoleDoc>('PlatformRole', platformRoleSchema);
