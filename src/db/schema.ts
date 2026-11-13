import {
  pgTable, uuid, text, timestamp, real, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('sessions_user_idx').on(t.userId)]);

export const passwordResets = pgTable('password_resets', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull().default(''),
  language: text('language').notNull().default('en'),
  units: text('units').notNull().default('km'),
  hemisphere: text('hemisphere').notNull().default('north'),
  locationId: text('location_id').notNull().default('cairo'),
  customLat: real('custom_lat'),
  customLon: real('custom_lon'),
  customTz: text('custom_tz'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const favoriteLandmarks = pgTable('favorite_landmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  landmarkId: text('landmark_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex('fav_user_landmark_idx').on(t.userId, t.landmarkId)]);

export const savedDates = pgTable('saved_dates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO 8601 instant
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('saved_dates_user_idx').on(t.userId)]);

export const observationJournal = pgTable('observation_journal', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  equipment: text('equipment').notNull().default('eye'),
  location: text('location').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('journal_user_idx').on(t.userId)]);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type FavoriteLandmark = typeof favoriteLandmarks.$inferSelect;
export type SavedDate = typeof savedDates.$inferSelect;
export type JournalEntry = typeof observationJournal.$inferSelect;