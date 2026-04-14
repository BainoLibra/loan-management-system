-- Loan Management System Database Schema
-- Compatible with MySQL 5.7+ / MySQL 8.x
-- Run against Railway MySQL database: railway

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- --------------------------------------------------------
-- Table: audit_logs
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT DEFAULT NULL,
  `action` VARCHAR(255) DEFAULT NULL,
  `entity` VARCHAR(50) DEFAULT
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed data: audit_logs
INSERT INTO `audit_logs` (`id`, `userId`, `action`, `entity`, `entityId`, `createdAt`) VALUES
(1, 4, 'CREATE_LOAN', 'loan', 1, '2026-02-28 05:12:11'),
(2, 4, 'CREATE_LOAN', 'loan', 2, '2026-02-28 05:13:13'),
(3, 4, 'CREATE_LOAN', 'loan', 3, '2026-02-28 05:13:42'),
(4, 4, 'CREATE_LOAN', 'loan', 4, '2026-02-28 05:15:25'),
(5, 4, 'CREATE_LOAN', 'loan', 5, '2026-02-28 05:15:47'),
(6, 4, 'APPROVE_LOAN', 'loan',  NULL,
  `entityId` INT DEFAULT NULL,1, '2026-02-28 05:33:32'),
(7, 4, 'APPROVE_LOAN', 'loan', 2, '2026-02-28 05:33:51'),
(8, 4, 'DISBURSE_LOAN', 'loan', 1, '2026-02-28 05:34:33'),
(9, 4, 'REPAY_LOAN', 'loan', 1, '2026-02-28 05:56:26'),
(10, 4, 'APPROVE_LOAN', 'loan', 3, '2026-03-02 05:33:11'),
(11, 4, 'DISBURSE_LOAN', 'loan', 3, '2026-03-02 05:34:37'),
(12, 4, 'APPROVE_LOAN', 'loan', 4, '2026-03-05 05:46:39'),
(13, 4, 'DISBURSE_LOAN', 'loan', 4, '2026-03-05 05:50:01'),
(14, 4, 'REPAY_LOAN', 'loan', 4, '2026-03-05 05:55:00'),
(15, 4, 'CREATE_LOAN', 'loan', 6, '2026-03-06 04:55:17'),
(16, 4, 'APPROVE_LOAN', 'loan', 6, '2026-03-06 04:57:12'),
(17, 4, 'DISBURSE_LOAN', 'loan', 6, '2026-03-06 04:57:58'),
(18, 4, 'REPAY_LOAN', 'loan', 3, '2026-03-11 05:51:16'),
(19, 4, 'APPROVE_LOAN', 'loan', 5, '2026-03-11 05:52:38'),
(20, 4, 'CREATE_LOAN', 'loan', 7, '2026-03-11 05:55:36'),
(21, 4, 'CREATE_CLIENT', 'client', 7, '2026-03-11 05:56:20'),
(22, 4, 'CREATE_LOAN', 'loan', 8, '2026-03-11 06:08:46'),
(23, 4, 'REPAY_LOAN', 'loan', 1, '2026-03-11 06:13:10');

-- --------------------------------------------------------
-- Table: clients
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `identifier` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed data: clients
INSERT INTO `clients` (`id`, `name`, `phone`, `email`, `identifier`, `status`, `createdAt`, `updatedAt`) VALUES
(1, 'Baino Libra', '0778764631', 'bainolibra213@gmail.com', 'NIN123', 'active', '2026-02-28 04:47:40', '2026-02-28 04:47:40'),
(2, 'Amon Muhwezi', '0775193423', 'amonmuhwezi@gmail.com', 'NIN124', 'active', '2026-02-28 04:51:38', '2026-02-28 04:51:38'),
(3, 'Marvin Tumu', '0781438172', 'marvin2026@gmail.com', 'NIN125', 'active', '2026-02-28 04:54:33', '2026-02-28 04:54:33'),
(4, 'Abaine Alvin', '0745704304', 'abainealvin01@gmail.com', 'NIN126', 'active', '2026-02-28 04:56:47', '2026-02-28 04:56:47'),
(5, 'Kamugisha Apollo', '0707766751', 'mugishaa@gmail.com', 'NIN126', 'active', '2026-02-28 04:59:32', '2026-02-28 04:59:32'),
(6, 'Kamugisha Apollo', '0707766751', 'mugishaa@gmail.com', 'NIN127', 'active', '2026-02-28 04:59:57', '2026-02-28 04:59:57'),
(7, 'Baino Libra', '0778764631', 'baino@gmail.com', 'NIN123', 'active', '2026-03-11 05:56:20', '2026-03-11 05:56:20');

-- --------------------------------------------------------
-- Table: loans
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `loans` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `clientId` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `interestRate` DECIMAL(5,2) NOT NULL,
  `termMonths` INT NOT NULL,
  `status` ENUM('applied','approved','disbursed','closed') DEFAULT 'applied',
  `appliedAt` DATETIME DEFAULT NULL,
  `approvedBy` INT DEFAULT NULL,
  `approvedAt` DATETIME DEFAULT NULL,
  `disbursedAt` DATETIME DEFAULT NULL,
  `balance` DECIMAL(15,2) NOT NULL,
  `createdBy` INT NOT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `clientId` (`clientId`),
  KEY `approvedBy` (`approvedBy`),
  KEY `createdBy` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed data: loans
INSERT INTO `loans` (`id`, `clientId`, `amount`, `interestRate`, `termMonths`, `status`, `appliedAt`, `approvedBy`, `approvedAt`, `disbursedAt`, `balance`, `createdBy`, `createdAt`, `updatedAt`) VALUES
(1, 1, 500000.00, 10.00, 6, 'disbursed', '2026-02-28 05:12:11', 4, '2026-02-28 05:33:32', '2026-02-28 05:34:33', 200000.00, 4, '2026-02-28 05:12:11', '2026-03-11 06:13:10'),
(2, 2, 600000.00, 10.00, 6, 'approved', '2026-02-28 05:13:13', 4, '2026-02-28 05:33:51', NULL, 600000.00, 4, '2026-02-28 05:13:13', '2026-02-28 05:33:51'),
(3, 3, 400000.00, 10.00, 6, 'disbursed', '2026-02-28 05:13:42', 4, '2026-03-02 05:33:11', '2026-03-02 05:34:37', 300000.00, 4, '2026-02-28 05:13:42', '2026-03-11 05:51:16'),
(4, 5, 700000.00, 10.00, 6, 'disbursed', '2026-02-28 05:15:25', 4, '2026-03-05 05:46:39', '2026-03-05 05:50:01', 500000.00, 4, '2026-02-28 05:15:25', '2026-03-05 05:55:00'),
(5, 4, 700000.00, 10.00, 6, 'approved', '2026-02-28 05:15:47', 4, '2026-03-11 05:52:38', NULL, 700000.00, 4, '2026-02-28 05:15:47', '2026-03-11 05:52:38'),
(6, 6, 800000.00, 10.00, 6, 'disbursed', '2026-03-06 04:55:17', 4, '2026-03-06 04:57:12', '2026-03-06 04:57:58', 800000.00, 4, '2026-03-06 04:55:17', '2026-03-06 04:57:58'),
(7, 4, 700000.00, 10.00, 6, 'applied', '2026-03-11 05:55:36', NULL, NULL, NULL, 700000.00, 4, '2026-03-11 05:55:36', '2026-03-11 05:55:36'),
(8, 7, 600000.00, 10.00, 6, 'applied', '2026-03-11 06:08:46', NULL, NULL, NULL, 600000.00, 4, '2026-03-11 06:08:46', '2026-03-11 06:08:46');

-- --------------------------------------------------------
-- Table: repayments
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `repayments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `loanId` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `paidBy` INT NOT NULL,
  `date` DATETIME NOT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `loanId` (`loanId`),
  KEY `paidBy` (`paidBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed data: repayments
INSERT INTO `repayments` (`id`, `loanId`, `amount`, `paidBy`, `date`, `createdAt`) VALUES
(1, 1, 100000.00, 4, '2026-02-28 05:56:26', '2026-02-28 05:56:26'),
(2, 4, 200000.00, 4, '2026-03-05 05:55:00', '2026-03-05 05:55:00'),
(3, 3, 100000.00, 4, '2026-03-11 05:51:16', '2026-03-11 05:51:16'),
(4, 1, 200000.00, 4, '2026-03-11 06:13:10', '2026-03-11 06:13:10');

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','loan_officer','cashier') NOT NULL,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed data: users
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `createdAt`, `updatedAt`) VALUES
(4, 'Admin', 'admin@test.com', '$2b$10$SZ4w.d/M3cX58uXp8H1gxuRR6hRYYZZfbPiRi631XY0xrwJ2YbYD2', 'admin', 'active', '2026-02-27 06:09:47', '2026-02-27 06:09:47'),
(6, 'Loan Officer', 'officer@test.com', '$2b$10$MF2ZuamyQ3Ham.1CdfgODugE/jvDII.YEd6LB.VpfeEWWhYD2v7BS', 'loan_officer', 'active', '2026-03-10 06:01:01', '2026-03-10 06:01:01');

-- --------------------------------------------------------
-- Foreign Key Constraints
-- --------------------------------------------------------

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`);

ALTER TABLE `loans`
  ADD CONSTRAINT `loans_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `loans_ibfk_2` FOREIGN KEY (`approvedBy`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `loans_ibfk_3` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`);

ALTER TABLE `repayments`
  ADD CONSTRAINT `repayments_ibfk_1` FOREIGN KEY (`loanId`) REFERENCES `loans` (`id`),
  ADD CONSTRAINT `repayments_ibfk_2` FOREIGN KEY (`paidBy`) REFERENCES `users` (`id`);
