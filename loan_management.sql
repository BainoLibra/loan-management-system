-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 21, 2026 at 04:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `loan_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `userId` int(11) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `entity` varchar(50) DEFAULT NULL,
  `entityId` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `userId`, `action`, `entity`, `entityId`, `createdAt`) VALUES
(1, 4, 'CREATE_LOAN', 'loan', 1, '2026-02-28 05:12:11'),
(2, 4, 'CREATE_LOAN', 'loan', 2, '2026-02-28 05:13:13'),
(3, 4, 'CREATE_LOAN', 'loan', 3, '2026-02-28 05:13:42'),
(4, 4, 'CREATE_LOAN', 'loan', 4, '2026-02-28 05:15:25'),
(5, 4, 'CREATE_LOAN', 'loan', 5, '2026-02-28 05:15:47'),
(6, 4, 'APPROVE_LOAN', 'loan', 1, '2026-02-28 05:33:32'),
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

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `identifier` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `name`, `phone`, `email`, `identifier`, `status`, `createdAt`, `updatedAt`) VALUES
(1, 'Baino Libra', '0778764631', 'bainolibra213@gmail.com', 'NIN123', 'active', '2026-02-28 04:47:40', '2026-02-28 04:47:40'),
(2, 'Amon Muhwezi', '0775193423', 'amonmuhwezi@gmail.com', 'NIN124', 'active', '2026-02-28 04:51:38', '2026-02-28 04:51:38'),
(3, 'Marvin Tumu', '0781438172', 'marvin2026@gmail.com', 'NIN125', 'active', '2026-02-28 04:54:33', '2026-02-28 04:54:33'),
(4, 'Abaine Alvin', '0745704304', 'abainealvin01@gmail.com', 'NIN126', 'active', '2026-02-28 04:56:47', '2026-02-28 04:56:47'),
(5, 'Kamugisha Apollo', '0707766751', 'mugishaa@gmail.com', 'NIN126', 'active', '2026-02-28 04:59:32', '2026-02-28 04:59:32'),
(6, 'Kamugisha Apollo', '0707766751', 'mugishaa@gmail.com', 'NIN127', 'active', '2026-02-28 04:59:57', '2026-02-28 04:59:57'),
(7, 'Baino Libra', '0778764631', 'baino@gmail.com', 'NIN123', 'active', '2026-03-11 05:56:20', '2026-03-11 05:56:20');

-- --------------------------------------------------------

--
-- Table structure for table `loans`
--

CREATE TABLE `loans` (
  `id` int(11) NOT NULL,
  `clientId` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `interestRate` decimal(5,2) NOT NULL,
  `termMonths` int(11) NOT NULL,
  `status` enum('applied','approved','disbursed','closed') DEFAULT 'applied',
  `appliedAt` datetime DEFAULT NULL,
  `approvedBy` int(11) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `disbursedAt` datetime DEFAULT NULL,
  `balance` decimal(15,2) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loans`
--

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

--
-- Table structure for table `repayments`
--

CREATE TABLE `repayments` (
  `id` int(11) NOT NULL,
  `loanId` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `paidBy` int(11) NOT NULL,
  `date` datetime NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `repayments`
--

INSERT INTO `repayments` (`id`, `loanId`, `amount`, `paidBy`, `date`, `createdAt`) VALUES
(1, 1, 100000.00, 4, '2026-02-28 05:56:26', '2026-02-28 05:56:26'),
(2, 4, 200000.00, 4, '2026-03-05 05:55:00', '2026-03-05 05:55:00'),
(3, 3, 100000.00, 4, '2026-03-11 05:51:16', '2026-03-11 05:51:16'),
(4, 1, 200000.00, 4, '2026-03-11 06:13:10', '2026-03-11 06:13:10');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','loan_officer','cashier') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `createdAt`, `updatedAt`) VALUES
(4, 'Admin', 'admin@test.com', '$2b$10$SZ4w.d/M3cX58uXp8H1gxuRR6hRYYZZfbPiRi631XY0xrwJ2YbYD2', 'admin', 'active', '2026-02-27 06:09:47', '2026-02-27 06:09:47'),
(6, 'Loan Officer', 'officer@test.com', '$2b$10$MF2ZuamyQ3Ham.1CdfgODugE/jvDII.YEd6LB.VpfeEWWhYD2v7BS', 'loan_officer', 'active', '2026-03-10 06:01:01', '2026-03-10 06:01:01');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `clientId` (`clientId`),
  ADD KEY `approvedBy` (`approvedBy`),
  ADD KEY `createdBy` (`createdBy`);

--
-- Indexes for table `repayments`
--
ALTER TABLE `repayments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `loanId` (`loanId`),
  ADD KEY `paidBy` (`paidBy`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `loans`
--
ALTER TABLE `loans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `repayments`
--
ALTER TABLE `repayments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`);

--
-- Constraints for table `loans`
--
ALTER TABLE `loans`
  ADD CONSTRAINT `loans_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `loans_ibfk_2` FOREIGN KEY (`approvedBy`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `loans_ibfk_3` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`);

--
-- Constraints for table `repayments`
--
ALTER TABLE `repayments`
  ADD CONSTRAINT `repayments_ibfk_1` FOREIGN KEY (`loanId`) REFERENCES `loans` (`id`),
  ADD CONSTRAINT `repayments_ibfk_2` FOREIGN KEY (`paidBy`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
