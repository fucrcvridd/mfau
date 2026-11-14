-- +goose Up

CREATE TABLE rooms (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE staff (
    id      BIGSERIAL PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    role    TEXT NOT NULL,
    room_id BIGINT NOT NULL REFERENCES rooms (id)
);

CREATE TABLE services (
    id        BIGSERIAL PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    price_rub BIGINT NOT NULL CHECK (price_rub >= 0)
);

CREATE TABLE patients (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    birth_date DATE NOT NULL,
    diagnosis  TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX patients_name_lower_idx ON patients (lower(name));

CREATE TABLE appointments (
    id          BIGSERIAL PRIMARY KEY,
    patient_id  BIGINT NOT NULL REFERENCES patients (id),
    staff_id    BIGINT NOT NULL REFERENCES staff (id),
    room_id     BIGINT NOT NULL REFERENCES rooms (id),
    service_id  BIGINT NOT NULL REFERENCES services (id),
    visit_date  DATE NOT NULL,
    visit_time  TIME NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('Ожидает', 'Завершен', 'Отменен')),
    cost_rub    BIGINT NOT NULL CHECK (cost_rub >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX appointments_visit_date_idx ON appointments (visit_date);

CREATE TABLE leads (
    id           BIGSERIAL PRIMARY KEY,
    patient_name TEXT NOT NULL,
    phone        TEXT NOT NULL,
    service_id   BIGINT NOT NULL REFERENCES services (id),
    preferred_at TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pharmacy_items (
    id        BIGSERIAL PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    stock     INT NOT NULL CHECK (stock >= 0),
    unit      TEXT NOT NULL,
    price_rub BIGINT NOT NULL CHECK (price_rub >= 0)
);

CREATE TABLE pharmacy_sales (
    id         BIGSERIAL PRIMARY KEY,
    item_id    BIGINT NOT NULL REFERENCES pharmacy_items (id),
    qty        INT NOT NULL CHECK (qty > 0),
    amount_rub BIGINT NOT NULL CHECK (amount_rub >= 0),
    sold_on    DATE NOT NULL
);

INSERT INTO rooms (name) VALUES
    ('Кабинет №1'),
    ('Кабинет №2'),
    ('Рентген-кабинет');

INSERT INTO staff (name, role, room_id) VALUES
    ('Дмитрий Зубов', 'Врач-стоматолог (Хирург)', (SELECT id FROM rooms WHERE name = 'Кабинет №1')),
    ('Ольга Васильева', 'Врач-стоматолог (Терапевт)', (SELECT id FROM rooms WHERE name = 'Кабинет №2')),
    ('Сергей Новиков', 'Рентген-лаборант', (SELECT id FROM rooms WHERE name = 'Рентген-кабинет'));

INSERT INTO services (name, price_rub) VALUES
    ('Консультация и осмотр', 2000),
    ('Лечение кариеса', 8500),
    ('Профессиональная гигиена', 6000),
    ('Имплантация', 45000),
    ('КТ челюсти', 4200);

INSERT INTO patients (name, phone, birth_date, diagnosis, notes) VALUES
    ('Елена Малышева', '+7 (999) 111-22-33', DATE '1975-05-12', 'Глубокий кариес зуба #36', 'Установлена световой пломба. Рекомендован осмотр через полгода.'),
    ('Иван Петров', '+7 (999) 222-33-44', DATE '1988-09-20', 'Здоров', 'Проведена плановая гигиена полости рта.'),
    ('Светлана Соколова', '+7 (999) 333-44-55', DATE '1992-12-04', 'Адентия зуба #46', 'Подготовка к имплантации. Сделано КТ.'),
    ('Алексей Смирнов', '+7 (999) 101-00-01', DATE '1984-03-11', 'Адентия', 'Имплантация в ноябре 2026.'),
    ('Мария Иванова', '+7 (999) 101-00-02', DATE '1990-07-02', 'Кариес', 'Лечение кариеса.'),
    ('Дмитрий Орлов', '+7 (999) 101-00-03', DATE '1979-01-19', 'Диагностика', 'КТ челюсти.');

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, DATE '2026-11-05', TIME '09:00', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Алексей Смирнов' AND st.name = 'Дмитрий Зубов' AND rm.name = 'Кабинет №1' AND sv.name = 'Имплантация';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, DATE '2026-11-02', TIME '12:30', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Мария Иванова' AND st.name = 'Ольга Васильева' AND rm.name = 'Кабинет №2' AND sv.name = 'Лечение кариеса';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, DATE '2026-10-28', TIME '16:00', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Елена Малышева' AND st.name = 'Ольга Васильева' AND rm.name = 'Кабинет №2' AND sv.name = 'Профессиональная гигиена';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, DATE '2026-10-14', TIME '11:00', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Дмитрий Орлов' AND st.name = 'Дмитрий Зубов' AND rm.name = 'Рентген-кабинет' AND sv.name = 'КТ челюсти';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, DATE '2025-12-19', TIME '10:30', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Светлана Соколова' AND st.name = 'Дмитрий Зубов' AND rm.name = 'Кабинет №1' AND sv.name = 'Консультация и осмотр';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, CURRENT_DATE, TIME '10:00', 'Ожидает', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Елена Малышева' AND st.name = 'Дмитрий Зубов' AND rm.name = 'Кабинет №1' AND sv.name = 'Лечение кариеса';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, CURRENT_DATE, TIME '11:30', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Иван Петров' AND st.name = 'Ольга Васильева' AND rm.name = 'Рентген-кабинет' AND sv.name = 'КТ челюсти';

INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
SELECT p.id, st.id, rm.id, sv.id, CURRENT_DATE, TIME '14:00', 'Завершен', sv.price_rub
FROM patients p, staff st, rooms rm, services sv
WHERE p.name = 'Светлана Соколова' AND st.name = 'Дмитрий Зубов' AND rm.name = 'Кабинет №1' AND sv.name = 'Имплантация';

INSERT INTO leads (patient_name, phone, service_id, preferred_at) VALUES
    ('Максим Сергеев', '+7 (900) 555-66-77', (SELECT id FROM services WHERE name = 'Профессиональная гигиена'), 'Завтра, 12:00'),
    ('Анна Ковалёва', '+7 (901) 444-33-22', (SELECT id FROM services WHERE name = 'Консультация и осмотр'), 'Послезавтра, 10:00');

INSERT INTO pharmacy_items (name, stock, unit, price_rub) VALUES
    ('Ультракаин (анестетик)', 45, 'ампул', 350),
    ('Имплант Straumann', 12, 'шт.', 28000),
    ('Коффердам (набор)', 30, 'шт.', 900);

INSERT INTO pharmacy_sales (item_id, qty, amount_rub, sold_on)
SELECT id, 4, price_rub * 4, CURRENT_DATE
FROM pharmacy_items
WHERE name = 'Ультракаин (анестетик)';

-- +goose Down

DROP TABLE IF EXISTS pharmacy_sales;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS pharmacy_items;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS rooms;
