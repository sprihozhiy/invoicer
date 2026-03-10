CREATE TABLE `access_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`business_name` text NOT NULL,
	`logo_url` text,
	`address_line1` text,
	`address_line2` text,
	`address_city` text,
	`address_state` text,
	`address_postal_code` text,
	`address_country` text,
	`phone` text,
	`email` text,
	`website` text,
	`tax_id` text,
	`default_currency` text DEFAULT 'USD' NOT NULL,
	`default_payment_terms_days` integer DEFAULT 30 NOT NULL,
	`default_tax_rate` real,
	`default_notes` text,
	`default_terms` text,
	`invoice_prefix` text DEFAULT 'INV' NOT NULL,
	`next_invoice_number` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bp_user_id_idx` ON `business_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `catalog_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit_price` integer NOT NULL,
	`unit` text,
	`taxable` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_user_id_idx` ON `catalog_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`company` text,
	`address_line1` text,
	`address_line2` text,
	`address_city` text,
	`address_state` text,
	`address_postal_code` text,
	`address_country` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `clients_user_id_idx` ON `clients` (`user_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`status` text NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text NOT NULL,
	`currency` text NOT NULL,
	`line_items` text NOT NULL,
	`subtotal` integer NOT NULL,
	`tax_rate` real,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`discount_type` text,
	`discount_value` real DEFAULT 0 NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`amount_due` integer NOT NULL,
	`notes` text,
	`terms` text,
	`sent_at` text,
	`paid_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoices_user_id_idx` ON `invoices` (`user_id`);--> statement-breakpoint
CREATE INDEX `invoices_client_id_idx` ON `invoices` (`client_id`);--> statement-breakpoint
CREATE INDEX `invoices_user_status_idx` ON `invoices` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`notes` text,
	`paid_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_invoice_id_idx` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_hash_unique` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`raw_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);