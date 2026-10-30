CREATE TABLE `research_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`organisation` text DEFAULT '' NOT NULL,
	`audience` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`deadline` text NOT NULL,
	`budget` text NOT NULL,
	`selections` text NOT NULL,
	`estimate` integer NOT NULL,
	`status` text DEFAULT 'Submitted' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `brief_owner_idx` ON `research_briefs` (`owner_id`);