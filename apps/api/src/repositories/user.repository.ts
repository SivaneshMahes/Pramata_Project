import type { UserRole } from '@vrp/shared-types';
import type { Types } from 'mongoose';
import { UserModel } from '../models/User.js';
import type { User } from '../models/User.js';

export type UserRecord = Omit<User, 'passwordHash'>;

export const userRepository = {
  findById(id: string | Types.ObjectId): Promise<UserRecord | null> {
    return UserModel.findById(id).lean<UserRecord>().exec();
  },

  findByEmailWithPassword(email: string): Promise<User | null> {
    return UserModel.findOne({ email }).select('+passwordHash').lean<User>().exec();
  },

  existsByEmail(email: string): Promise<boolean> {
    return UserModel.exists({ email }).then(Boolean);
  },

  findByGoogleId(googleId: string): Promise<UserRecord | null> {
    return UserModel.findOne({ googleId }).lean<UserRecord>().exec();
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash?: string;
    role: UserRole | null;
    authProvider?: 'local' | 'google';
    googleId?: string;
  }): Promise<UserRecord> {
    const user = await UserModel.create(data);
    const { passwordHash: _omit, ...rest } = user.toObject();
    return rest;
  },

  updateProfile(id: string, data: { name: string }): Promise<UserRecord | null> {
    return UserModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .lean<UserRecord>()
      .exec();
  },

  /** Sets a role exactly once (only while still null) — onboarding can't be replayed. */
  setRoleIfUnset(id: string, role: UserRole): Promise<UserRecord | null> {
    return UserModel.findOneAndUpdate({ _id: id, role: null }, { $set: { role } }, { new: true })
      .lean<UserRecord>()
      .exec();
  },

  linkGoogleAccount(id: Types.ObjectId, googleId: string): Promise<UserRecord | null> {
    return UserModel.findByIdAndUpdate(id, { $set: { googleId } }, { new: true })
      .lean<UserRecord>()
      .exec();
  },
};
