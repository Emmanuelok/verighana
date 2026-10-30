import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const briefs = sqliteTable('research_briefs', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  name: text('name').notNull(), email: text('email').notNull(),
  organisation: text('organisation').notNull().default(''), audience: text('audience').notNull(),
  title: text('title').notNull(), description: text('description').notNull(),
  deadline: text('deadline').notNull(), budget: text('budget').notNull(),
  selections: text('selections').notNull(), estimate: integer('estimate').notNull(),
  status: text('status').notNull().default('Submitted'), createdAt: text('created_at').notNull(),
}, (table) => [index('brief_owner_idx').on(table.ownerId)]);
