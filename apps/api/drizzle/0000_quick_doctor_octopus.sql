CREATE TABLE `brouillons` (
	`id` text PRIMARY KEY NOT NULL,
	`titre` text NOT NULL,
	`statut` text DEFAULT 'brouillon' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`reseaux` text DEFAULT '{}' NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `slides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brouillon_id` text NOT NULL,
	`fichier` text NOT NULL,
	`position` integer NOT NULL
);
