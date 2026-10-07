/**
 * Form schemas. They are the same Zod schemas the API enforces (from
 * @vrp/validation), so a form can never accept what the server will reject —
 * the server still validates every request independently.
 */
export {
  googleSignInSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  updateReviewSchema,
  uploadUrlRequestSchema,
  vehicleImageSchema,
  vehicleInputSchema,
} from '@vrp/validation';
export type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UpdateReviewInput,
  VehicleInput,
} from '@vrp/validation';
