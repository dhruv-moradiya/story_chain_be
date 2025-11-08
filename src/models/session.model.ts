import mongoose, { Schema } from 'mongoose';
import { ISessionDoc } from '../features/sesstion/sesstion.types';

const sessionSchema = new Schema<ISessionDoc>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  clientId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'revoked'],
    default: 'active',
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
  },
  lastActiveAt: {
    type: Date,
  },
  expireAt: {
    type: Date,
  },
  abandonAt: {
    type: Date,
  },
});

sessionSchema.index({ userId: 1, status: 1 });

const Session = mongoose.model('Session', sessionSchema);

export { Session };
