/*
SQLyog Community v13.3.1 (64 bit)
MySQL - 8.4.7 : Database - mvacable
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`mvacable` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `mvacable`;

/*Table structure for table `cable_collection_logs` */

DROP TABLE IF EXISTS `cable_collection_logs`;

CREATE TABLE `cable_collection_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `collection_id` int NOT NULL,
  `action` varchar(20) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `collection_month` date DEFAULT NULL,
  `old_amount` decimal(12,2) DEFAULT NULL,
  `new_amount` decimal(12,2) DEFAULT NULL,
  `old_pay_mode` varchar(10) DEFAULT NULL,
  `new_pay_mode` varchar(10) DEFAULT NULL,
  `old_paid_date` date DEFAULT NULL,
  `new_paid_date` date DEFAULT NULL,
  `reason` text,
  `uid` int DEFAULT NULL,
  `shop_id` varchar(255) DEFAULT NULL,
  `log_date` date DEFAULT NULL,
  `log_time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cable_collection_log` (`shop_id`,`log_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `cable_collection_logs` */

insert  into `cable_collection_logs`(`id`,`collection_id`,`action`,`customer_id`,`collection_month`,`old_amount`,`new_amount`,`old_pay_mode`,`new_pay_mode`,`old_paid_date`,`new_paid_date`,`reason`,`uid`,`shop_id`,`log_date`,`log_time`) values 
(1,15,'edit','c02','2026-09-01',300.00,300.00,'cash','upi','2026-09-19','2026-09-19','d',1,'S01','2026-09-19','12:39:50');

/*Table structure for table `cable_collections` */

DROP TABLE IF EXISTS `cable_collections`;

CREATE TABLE `cable_collections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_pk` int NOT NULL,
  `customer_id` varchar(50) NOT NULL,
  `collection_month` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `due_amount` decimal(12,2) DEFAULT NULL,
  `pay_mode` varchar(10) NOT NULL,
  `paid_date` date NOT NULL,
  `paid_time` time NOT NULL,
  `uid` int DEFAULT NULL,
  `shop_id` varchar(255) DEFAULT NULL,
  `notes` text,
  `is_cancelled` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_cable_collection_month` (`shop_id`,`customer_pk`,`collection_month`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `cable_collections` */

insert  into `cable_collections`(`id`,`customer_pk`,`customer_id`,`collection_month`,`amount`,`due_amount`,`pay_mode`,`paid_date`,`paid_time`,`uid`,`shop_id`,`notes`,`is_cancelled`) values 
(1,1,'C01','2026-07-01',250.00,450.00,'cash','2026-09-19','11:43:03',1,'S01',NULL,0),
(2,1,'C01','2026-07-01',100.00,450.00,'upi','2026-09-19','11:45:06',1,'S01',NULL,0),
(3,1,'C01','2026-07-01',100.00,450.00,'cash','2026-09-19','11:49:08',1,'S01',NULL,0),
(4,1,'C01','2026-08-01',450.00,450.00,'cash','2026-09-19','11:49:11',1,'S01',NULL,0),
(5,1,'C01','2026-09-01',100.00,450.00,'cash','2026-09-19','11:55:46',1,'S01',NULL,0),
(6,1,'C01','2026-09-01',50.00,450.00,'cash','2026-09-19','11:58:58',1,'S01',NULL,0),
(7,2,'w01','2026-09-01',1500.00,1500.00,'cash','2026-09-19','12:05:53',1,'S01',NULL,0),
(8,1,'C01','2026-09-01',100.00,450.00,'cash','2026-09-19','12:07:26',1,'S01',NULL,0),
(9,1,'C01','2026-09-01',100.00,450.00,'cash','2026-09-19','12:07:45',1,'S01',NULL,0),
(10,3,'c02','2026-05-01',250.00,250.00,'cash','2026-09-19','12:17:48',1,'S01',NULL,0),
(11,1,'C01','2026-09-01',100.00,450.00,'cash','2026-09-19','12:26:50',1,'S01',NULL,0),
(12,3,'c02','2026-06-01',300.00,300.00,'cash','2026-09-19','12:27:44',1,'S01',NULL,0),
(13,3,'c02','2026-07-01',300.00,300.00,'upi','2026-09-19','12:27:46',1,'S01',NULL,0),
(14,3,'c02','2026-08-01',300.00,300.00,'upi','2026-09-19','12:28:08',1,'S01',NULL,0),
(15,3,'c02','2026-09-01',300.00,300.00,'upi','2026-09-19','12:28:14',1,'S01',NULL,0);

/*Table structure for table `cable_customers` */

DROP TABLE IF EXISTS `cable_customers`;

CREATE TABLE `cable_customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_type` varchar(10) NOT NULL,
  `customer_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `address` text,
  `area` varchar(255) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `notes` text,
  `monthly_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `disconnect_date` date DEFAULT NULL,
  `disconnect_notes` text,
  `reconnect_date` date DEFAULT NULL,
  `reconnect_notes` text,
  `uid` int DEFAULT NULL,
  `shop_id` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cable_customer_shop` (`shop_id`,`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `cable_customers` */

insert  into `cable_customers`(`id`,`customer_type`,`customer_id`,`name`,`mobile`,`address`,`area`,`joining_date`,`notes`,`monthly_amount`,`is_active`,`disconnect_date`,`disconnect_notes`,`reconnect_date`,`reconnect_notes`,`uid`,`shop_id`,`created_at`) values 
(1,'cable','C01','Jaswa','9597451419','joseph\nthi\nbho\nkk\nTamilnadu','boo','2026-07-01','ssss',450.00,1,'2026-09-19','ss','2026-09-19','a',1,'S01','2026-09-19 11:02:12'),
(2,'wifi','w01','jebs','8667214152','19-120 Joseph Colony\nThittuvilai, Boothapandi','nag','2026-09-19','s',1500.00,1,NULL,NULL,NULL,NULL,1,'S01','2026-09-19 11:04:30'),
(3,'cable','c02','New','8667214152','','','2026-05-01','s',300.00,1,NULL,NULL,NULL,NULL,1,'S01','2026-09-19 12:16:55'),
(4,'wifi','w02','new','98989999','s','','2026-09-19','',800.00,1,NULL,NULL,NULL,NULL,1,'S01','2026-09-19 12:49:37');

/*Table structure for table `company_details` */

DROP TABLE IF EXISTS `company_details`;

CREATE TABLE `company_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `shop_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `address` text,
  `gstin` varchar(255) DEFAULT NULL,
  `print_type` int NOT NULL DEFAULT '0',
  `printer_name` varchar(255) DEFAULT NULL,
  `bank_details` varchar(255) DEFAULT NULL,
  `barcode_printer` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `company_details` */

insert  into `company_details`(`id`,`shop_name`,`address`,`gstin`,`print_type`,`printer_name`,`bank_details`,`barcode_printer`) values 
(2,'MVA CABLE','NAGAPATTINAM','',1,'BP3010','Bank Details','AP4909');

/*Table structure for table `customer_account` */

DROP TABLE IF EXISTS `customer_account`;

CREATE TABLE `customer_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `advance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `customer_account` */

/*Table structure for table `customers` */

DROP TABLE IF EXISTS `customers`;

CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  `is_eligible_for_commission` tinyint DEFAULT '1',
  `is_active` int DEFAULT '1',
  `gstin` varchar(255) DEFAULT NULL,
  `is_gst` int DEFAULT '0',
  `salesman` int DEFAULT NULL,
  `area` int DEFAULT NULL,
  `credit_limit` double(10,2) NOT NULL DEFAULT '0.00',
  `local` int DEFAULT '1',
  `exchange_point` double(10,3) DEFAULT '0.000',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `customers` */

/*Table structure for table `expense_entry` */

DROP TABLE IF EXISTS `expense_entry`;

CREATE TABLE `expense_entry` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `exp_type` int NOT NULL,
  `content` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `exc_date_time` datetime DEFAULT NULL,
  `entry_date_time` datetime DEFAULT NULL,
  `is_active` int DEFAULT '1',
  `uid` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `type` (`exp_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `expense_entry` */

/*Table structure for table `expense_type` */

DROP TABLE IF EXISTS `expense_type`;

CREATE TABLE `expense_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `expense_type` */

/*Table structure for table `outlets` */

DROP TABLE IF EXISTS `outlets`;

CREATE TABLE `outlets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `shop_id` varchar(255) NOT NULL,
  `shop_name` varchar(255) NOT NULL,
  `Address` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `outlets` */

insert  into `outlets`(`id`,`shop_id`,`shop_name`,`Address`) values 
(1,'S01','Chennai1','Nagercoil'),
(2,'S02','Chennai2','Chennai'),
(3,'S03','Mylapore','Mylapore');

/*Table structure for table `salon_expenses` */

DROP TABLE IF EXISTS `salon_expenses`;

CREATE TABLE `salon_expenses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `amount` decimal(12,2) NOT NULL,
  `expense_for` varchar(255) NOT NULL,
  `shop_id` varchar(255) DEFAULT NULL,
  `uid` int DEFAULT NULL,
  `exp_date` date DEFAULT NULL,
  `exp_time` time DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `salon_expenses` */

insert  into `salon_expenses`(`id`,`amount`,`expense_for`,`shop_id`,`uid`,`exp_date`,`exp_time`) values 
(1,10.00,'Tea','S01',1,'2026-09-11','22:07:06'),
(2,20.00,'rent','S01',28,'2026-09-11','22:11:17'),
(3,150.00,'petrol','S01',1,'2026-09-19','12:31:15');

/*Table structure for table `special_permission` */

DROP TABLE IF EXISTS `special_permission`;

CREATE TABLE `special_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `content` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `special_permission` */

insert  into `special_permission`(`id`,`content`) values 
(1,'allow to Zero stock billing ');

/*Table structure for table `trans_bill` */

DROP TABLE IF EXISTS `trans_bill`;

CREATE TABLE `trans_bill` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tr_no` varchar(255) NOT NULL,
  `customer_id` int DEFAULT NULL,
  `cus_name` varchar(255) DEFAULT '-',
  `cus_phn` varchar(255) DEFAULT '-',
  `load_from` varchar(255) NOT NULL,
  `load_to` varchar(255) NOT NULL,
  `freight_amount` double(10,3) DEFAULT '0.000',
  `paid` double(10,3) DEFAULT '0.000',
  `cash_paid` double(10,3) DEFAULT '0.000',
  `bank_paid` double(10,3) DEFAULT '0.000',
  `balance` double(10,3) DEFAULT '0.000',
  `current_balance` double(10,3) DEFAULT '0.000',
  `is_balance` int DEFAULT '0',
  `payment_mode` int NOT NULL DEFAULT '1',
  `payment_type` int DEFAULT '0',
  `is_allotted` tinyint DEFAULT '0',
  `allotted_uid` int DEFAULT NULL,
  `allotted_at` datetime DEFAULT NULL,
  `uid` int NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL DEFAULT '00:00:00',
  `is_cancelled` int DEFAULT '0',
  `vehicle_no` varchar(50) DEFAULT NULL,
  `driver_no` varchar(50) DEFAULT NULL,
  `owner_no` varchar(50) DEFAULT NULL,
  `pay_date` date DEFAULT NULL,
  `utr_no` varchar(80) DEFAULT NULL,
  `veh_freight` double(10,3) DEFAULT '0.000',
  `veh_paid` double(10,3) DEFAULT '0.000',
  `veh_cash_paid` double(10,3) DEFAULT '0.000',
  `veh_bank_paid` double(10,3) DEFAULT '0.000',
  `veh_balance` double(10,3) DEFAULT '0.000',
  `veh_payment_mode` int DEFAULT '1',
  `veh_payment_type` int DEFAULT '0',
  `veh_pay_date` date DEFAULT NULL,
  `veh_utr_no` varchar(80) DEFAULT NULL,
  `is_unloaded` tinyint DEFAULT '0',
  `unloaded_at` datetime DEFAULT NULL,
  `unloaded_uid` int DEFAULT NULL,
  `bill_image` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `is_allotted` (`is_allotted`),
  KEY `current_balance` (`current_balance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `trans_bill` */

/*Table structure for table `trans_bill_due` */

DROP TABLE IF EXISTS `trans_bill_due`;

CREATE TABLE `trans_bill_due` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `amount` double(10,3) NOT NULL DEFAULT '0.000',
  `cash_paid` double(10,3) NOT NULL DEFAULT '0.000',
  `bank_paid` double(10,3) NOT NULL DEFAULT '0.000',
  `balance` double(10,3) NOT NULL DEFAULT '0.000',
  `pay_mode` tinyint NOT NULL DEFAULT '1',
  `pay_type` tinyint NOT NULL DEFAULT '0',
  `txn_type` varchar(20) NOT NULL DEFAULT 'COLLECTION',
  `notes` varchar(255) DEFAULT NULL,
  `uid` int NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `utr_no` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_id` (`bill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `trans_bill_due` */

/*Table structure for table `user_modules` */

DROP TABLE IF EXISTS `user_modules`;

CREATE TABLE `user_modules` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `module_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=latin1;

/*Data for the table `user_modules` */

insert  into `user_modules`(`id`,`module_name`) values 
(1,'Add Customer'),
(2,'Active customer list'),
(3,'Collection entry'),
(4,'Collection report'),
(5,'Expense'),
(6,'Admin'),
(7,'Dashboard');

/*Table structure for table `user_permission` */

DROP TABLE IF EXISTS `user_permission`;

CREATE TABLE `user_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `uid` int NOT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mod` (`module_id`),
  KEY `uid` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=190 DEFAULT CHARSET=latin1;

/*Data for the table `user_permission` */

insert  into `user_permission`(`id`,`module_id`,`uid`,`date`,`time`) values 
(163,1,1,'2026-09-11','21:48:02'),
(168,2,1,'2026-09-11','21:48:02'),
(171,3,1,'2026-09-11','22:05:49'),
(176,4,1,'2026-09-11','22:05:49'),
(179,5,1,'2026-09-11','22:05:49'),
(180,6,1,'2026-09-11','22:10:57'),
(189,7,1,'2026-09-19','22:10:57');

/*Table structure for table `user_special_permission` */

DROP TABLE IF EXISTS `user_special_permission`;

CREATE TABLE `user_special_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `content_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `user_special_permission` */

insert  into `user_special_permission`(`id`,`content_id`,`user_id`) values 
(3,1,1);

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_active` int DEFAULT '1',
  `fullName` varchar(255) DEFAULT NULL,
  `disc_per` int DEFAULT '100',
  `shop_id` varchar(255) DEFAULT NULL,
  `is_admin` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=latin1;

/*Data for the table `users` */

insert  into `users`(`id`,`user_name`,`password`,`is_active`,`fullName`,`disc_per`,`shop_id`,`is_admin`) values 
(1,'admin','aecbf9a63cec1e93327dfc212f31acdb31c4f5d10bedccf8fbb8b042a6f0f39155797bdd04517905ae5d98b69fdc452cdb61b018e10939740ec96f36e133d639',1,'admin',50,'S01',1),
(28,'admin1','aecbf9a63cec1e93327dfc212f31acdb31c4f5d10bedccf8fbb8b042a6f0f39155797bdd04517905ae5d98b69fdc452cdb61b018e10939740ec96f36e133d639',1,'admin1',100,'S01',0),
(29,'admin2','aecbf9a63cec1e93327dfc212f31acdb31c4f5d10bedccf8fbb8b042a6f0f39155797bdd04517905ae5d98b69fdc452cdb61b018e10939740ec96f36e133d639',1,'admin2',100,'S02',0);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
