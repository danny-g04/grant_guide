CREATE DATABASE IF NOT EXISTS budget_path;

USE budget_path;

/*Preference Tables with pre-set information */
CREATE TABLE
  IF NOT EXISTS salary (
    salary_id INT AUTO_INCREMENT PRIMARY KEY,
    salary DECIMAL(12, 2) NOT NULL,
    fringe_rate DECIMAL(5, 2) NOT NULL,
    fte_percent DECIMAL(5, 2) DEFAULT 100.00
  );

CREATE TABLE
  IF NOT EXISTS travel_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_type ENUM ('Domestic', 'International') NOT NULL,
    airfare DECIMAL(10, 2) NOT NULL,
    per_diem DECIMAL(10, 2) NOT NULL,
    lodging_caps DECIMAL(10, 2) NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS tuition_fee_schedules (
    tuition_id INT AUTO_INCREMENT PRIMARY KEY,
    semester ENUM ('fall', 'spring', 'summer') NOT NULL,
    residency_status ENUM ('in_state', 'out_state') NOT NULL,
    tuition_semester DECIMAL(10, 2) NOT NULL,
    fee_semester DECIMAL(10, 2) NOT NULL,
    annual_increase_semester DECIMAL(5, 4) NOT NULL,
    CONSTRAINT uq_sem_res UNIQUE (semester, residency_status)
  );

/*Automatically creating rows for reference tables*/
INSERT INTO
  travel_profiles (trip_type, airfare, per_diem, lodging_caps)
VALUES
  ('Domestic', 500, 60, 120),
  ('International', 1200, 85, 160);

INSERT INTO
  salary (salary, fringe_rate, fte_percent)
VALUES
  (100000, 29.5, DEFAULT),
  (80000, 29.5, DEFAULT),
  (60000, 36.7, DEFAULT),
  (10000, 3.2, 50);

INSERT INTO
  tuition_fee_schedules (
    semester,
    residency_status,
    tuition_semester,
    fee_semester,
    annual_increase_semester
  )
VALUES
  ('fall', 'in_state', 5000, 300, 0.03),
  ('fall', 'out_state', 10000, 600, 0.03),
  ('spring', 'in_state', 4500, 300, 0.03),
  ('spring', 'out_state', 9000, 600, 0.03),
  ('summer', 'in_state', 2000, 300, 0.03),
  ('summer', 'out_state', 4000, 600, 0.03);

/* Dependent Tables that uses reference tables. User inserts data into these tables */
CREATE TABLE
  IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    password VARCHAR(128) NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS faculty (
    faculty_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    role ENUM ('PI', 'Co-PI', 'Staff') NOT NULL,
    salary_id INT NOT NULL DEFAULT 3,
    CONSTRAINT fk_faculty_salary FOREIGN KEY (salary_id) REFERENCES salary (salary_id)
  );

CREATE TABLE
  IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    residency_status ENUM ('in_state', 'out_state') NOT NULL,
    salary_id INT NULL DEFAULT 4,
    tuition_id INT NOT NULL,
    CONSTRAINT fk_students_salary FOREIGN KEY (salary_id) REFERENCES salary (salary_id),
    CONSTRAINT fk_students_tuition FOREIGN KEY (tuition_id) REFERENCES tuition_fee_schedules (tuition_id)
  );

CREATE TABLE
  IF NOT EXISTS budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    total_amount DECIMAL(65, 2) NOT NULL,
    length INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    budget_id INT NOT NULL,
    member_type ENUM ('faculty', 'student') NOT NULL,
    /* added from the post in server.js*/
    people_id INT NOT NULL,
    CONSTRAINT fk_members_budget FOREIGN KEY (budget_id) REFERENCES budgets (budget_id),
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (user_id)
  );