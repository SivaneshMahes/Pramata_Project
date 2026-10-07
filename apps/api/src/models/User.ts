import { USER_ROLES } from '@vrp/shared-types';
import type { UserRole } from '@vrp/shared-types';
import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** bcrypt hash. Never selected unless explicitly requested. */
  passwordHash?: string;
  /** Null only while a Google sign-up has not completed role onboarding. */
  role: UserRole | null;
  authProvider: 'local' | 'google';
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: [...USER_ROLES, null], default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export const UserModel = model<User>('User', userSchema);
