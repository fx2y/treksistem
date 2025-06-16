CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`impersonated_mitra_id` text,
	`target_entity` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`payload` text,
	`timestamp` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`impersonated_mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_logs_admin_user_action_idx` ON `audit_logs` (`admin_user_id`,`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_timestamp_idx` ON `audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `driver_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`mitra_id` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_invites_token_unique` ON `driver_invites` (`token`);--> statement-breakpoint
CREATE TABLE `driver_locations` (
	`driver_id` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`last_seen_at` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mitra_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `drivers_mitra_user_idx` ON `drivers` (`mitra_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY NOT NULL,
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
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_public_id_unique` ON `invoices` (`public_id`);--> statement-breakpoint
CREATE TABLE `master_facilities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `master_payload_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `master_vehicle_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `mitras` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`business_name` text NOT NULL,
	`address` text,
	`phone` text,
	`lat` real,
	`lng` real,
	`subscription_status` text DEFAULT 'free_tier' NOT NULL,
	`midtrans_subscription_id` text,
	`active_driver_limit` integer DEFAULT 2 NOT NULL,
	`has_completed_onboarding` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`template_id` text,
	`recipient_phone` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'generated' NOT NULL,
	`generated_at` integer DEFAULT (current_timestamp) NOT NULL,
	`triggered_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `notification_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`language` text DEFAULT 'id' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `oauth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`code_verifier` text NOT NULL,
	`provider` text DEFAULT 'google' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_sessions_state_unique` ON `oauth_sessions` (`state`);--> statement-breakpoint
CREATE TABLE `order_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`stage` text NOT NULL,
	`notes` text,
	`photo_url` text,
	`timestamp` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`type` text NOT NULL,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_stops_order_sequence_idx` ON `order_stops` (`order_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `order_stops_order_status_idx` ON `order_stops` (`order_id`,`status`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`service_id` text NOT NULL,
	`assigned_driver_id` text,
	`assigned_vehicle_id` text,
	`status` text DEFAULT 'pending_dispatch' NOT NULL,
	`orderer_name` text NOT NULL,
	`orderer_phone` text NOT NULL,
	`recipient_name` text NOT NULL,
	`recipient_phone` text NOT NULL,
	`estimated_cost` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_id_unique` ON `orders` (`public_id`);--> statement-breakpoint
CREATE INDEX `orders_service_status_idx` ON `orders` (`service_id`,`status`);--> statement-breakpoint
CREATE INDEX `orders_assigned_driver_status_idx` ON `orders` (`assigned_driver_id`,`status`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`hashed_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `service_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`base_fee` integer NOT NULL,
	`fee_per_km` integer NOT NULL,
	`fee_per_kg` integer,
	`fee_per_item` integer,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`mitra_id` text NOT NULL,
	`name` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`max_range_km` real,
	FOREIGN KEY (`mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `services_to_facilities` (
	`service_id` text NOT NULL,
	`facility_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`facility_id`) REFERENCES `master_facilities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `services_to_facilities_pk` ON `services_to_facilities` (`service_id`,`facility_id`);--> statement-breakpoint
CREATE TABLE `services_to_payload_types` (
	`service_id` text NOT NULL,
	`payload_type_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payload_type_id`) REFERENCES `master_payload_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `services_to_payload_types_pk` ON `services_to_payload_types` (`service_id`,`payload_type_id`);--> statement-breakpoint
CREATE TABLE `services_to_vehicle_types` (
	`service_id` text NOT NULL,
	`vehicle_type_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_type_id`) REFERENCES `master_vehicle_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `services_to_vehicle_types_pk` ON `services_to_vehicle_types` (`service_id`,`vehicle_type_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`mitra_id` text NOT NULL,
	`license_plate` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
