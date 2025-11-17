import mongoose, { Schema } from 'mongoose';
import { IPlatformRoleDoc } from '../features/platformRole/platformRole.types';

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

export const PlatformRole = mongoose.model<IPlatformRoleDoc>('PlatformRole', platformRoleSchema);
