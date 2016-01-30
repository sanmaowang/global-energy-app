/* STATEMENT_BOUNDARY */
CREATE TABLE IF NOT EXISTS `country` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code2l` varchar(2) DEFAULT NULL,
  `code3l` varchar(3) DEFAULT NULL,
  `name` varchar(128) DEFAULT NULL,
  `name_english` varchar(64) DEFAULT NULL,
  `name_official` varchar(128) DEFAULT NULL,
  `flag` varchar(255) DEFAULT NULL,
  `order` int(11) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` int(11) DEFAULT NULL,
  `updated_at` int(11) DEFAULT NULL
);
/* STATEMENT_BOUNDARY */
CREATE TABLE IF NOT EXISTS `country_data` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `country_id` int(11) DEFAULT NULL,
  `data_key` varchar(80) DEFAULT NULL,
  `data_value` varchar(255) DEFAULT NULL,
  `data_version` varchar(25) DEFAULT NULL
);
/* STATEMENT_BOUNDARY */
CREATE TABLE IF NOT EXISTS `country_data_meta` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `indicator_code` varchar(64) DEFAULT NULL,
  `indicator_name` varchar(128) DEFAULT NULL,
  `indicator_name_cn` varchar(128) DEFAULT NULL,
  `source_note` text,
  `source_note_cn` text,
  `source_organization` text,
  `source_organization_cn` text
);
/* STATEMENT_BOUNDARY */
CREATE TABLE IF NOT EXISTS `country_org_rel` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `country_id` int(11) DEFAULT NULL,
  `org_id` int(11) DEFAULT NULL,
  `type` varchar(5) DEFAULT NULL,
  `join_time` date DEFAULT NULL,
  `exit_time` date DEFAULT NULL
);
/* STATEMENT_BOUNDARY */
CREATE TABLE IF NOT EXISTS `organization` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `english_name` varchar(255) DEFAULT NULL,
  `slug` varchar(80) DEFAULT NULL,
  `founding_year` varchar(25) DEFAULT NULL,
  `initiating_country` varchar(80) DEFAULT NULL,
  `funding_model` varchar(80) DEFAULT NULL,
  `top_funding_country` varchar(25) DEFAULT NULL,
  `responsible_person` varchar(255) DEFAULT NULL,
  `description` text,
  `english_description` text,
  `created_at` int(11) DEFAULT NULL,
  `updated_at` int(11) DEFAULT NULL
);
/* STATEMENT_BOUNDARY */


