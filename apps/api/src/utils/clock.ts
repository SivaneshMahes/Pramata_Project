import { todayInTimeZone } from '@vrp/validation';
import { env } from '../config/env.js';

/**
 * "Today" for rental rules is a calendar date in the business timezone, not
 * the server's local date. Every date-based rule reads it from here.
 */
export const businessToday = (): string => todayInTimeZone(env.BUSINESS_TIMEZONE);
