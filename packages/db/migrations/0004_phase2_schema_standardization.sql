-- Phase 2: Database schema standardization migration
-- Add missing columns and update timestamp constraints

-- Add has_completed_onboarding to mitras table
ALTER TABLE `mitras` ADD `has_completed_onboarding` integer DEFAULT false NOT NULL;

-- Add template_id to notification_logs table
ALTER TABLE `notification_logs` ADD `template_id` text;

-- Add generated_at and triggered_at to notification_logs table
ALTER TABLE `notification_logs` ADD `generated_at` integer;
ALTER TABLE `notification_logs` ADD `triggered_at` integer;

-- Add updated_at to notification_templates table
ALTER TABLE `notification_templates` ADD `updated_at` integer;

-- Add created_at and updated_at to vehicles table (if not exists)
ALTER TABLE `vehicles` ADD `created_at` integer;
ALTER TABLE `vehicles` ADD `updated_at` integer;

-- Create notification_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS `notification_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`language` text DEFAULT 'id' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);

-- Create many-to-many tables for services
CREATE TABLE IF NOT EXISTS `services_to_vehicle_types` (
	`service_id` text NOT NULL,
	`vehicle_type_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE cascade,
	FOREIGN KEY (`vehicle_type_id`) REFERENCES `master_vehicle_types`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `services_to_payload_types` (
	`service_id` text NOT NULL,
	`payload_type_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE cascade,
	FOREIGN KEY (`payload_type_id`) REFERENCES `master_payload_types`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `services_to_facilities` (
	`service_id` text NOT NULL,
	`facility_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE cascade,
	FOREIGN KEY (`facility_id`) REFERENCES `master_facilities`(`id`) ON DELETE cascade
);

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS `services_to_vehicle_types_pk` ON `services_to_vehicle_types` (`service_id`,`vehicle_type_id`);
CREATE INDEX IF NOT EXISTS `services_to_payload_types_pk` ON `services_to_payload_types` (`service_id`,`payload_type_id`);
CREATE INDEX IF NOT EXISTS `services_to_facilities_pk` ON `services_to_facilities` (`service_id`,`facility_id`);

-- Add foreign key to notification_logs template_id
-- Note: SQLite doesn't support adding foreign keys to existing tables easily,
-- so we'll handle this constraint in the application layer for now

-- Create invoices table
CREATE TABLE IF NOT EXISTS `invoices` (
	`id` integer PRIMARY KEY,
	`public_id` text NOT NULL,
	`mitra_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`description` text,
	`qris_payload` text,
	`due_date` integer,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `invoices_public_id_unique` ON `invoices` (`public_id`);