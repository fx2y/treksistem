-- Setup test data for QRIS billing verification

-- Insert test users
INSERT OR REPLACE INTO users (id, google_id, email, name, role, created_at) VALUES
('admin01', 'google_admin01', 'admin@treksistem.com', 'Master Admin', 'admin', strftime('%s', 'now') * 1000),
('mitra01', 'google_mitra01', 'mitra01@test.com', 'Free Mitra', 'user', strftime('%s', 'now') * 1000),
('mitra02', 'google_mitra02', 'mitra02@test.com', 'Active Mitra', 'user', strftime('%s', 'now') * 1000),
('mitra03', 'google_mitra03', 'mitra03@test.com', 'Past Due Mitra', 'user', strftime('%s', 'now') * 1000),
('driver01', 'google_driver01', 'driver01@test.com', 'Test Driver 1', 'user', strftime('%s', 'now') * 1000),
('driver02', 'google_driver02', 'driver02@test.com', 'Test Driver 2', 'user', strftime('%s', 'now') * 1000);

-- Insert test mitras
INSERT OR REPLACE INTO mitras (id, user_id, business_name, address, phone, subscription_status, active_driver_limit) VALUES
('mitra01', 'mitra01', 'Free Tier Business', 'Jl. Test 1', '+628123456789', 'free_tier', 2),
('mitra02', 'mitra02', 'Toko Roti Enak', 'Jl. Roti Manis 123', '+628123456790', 'active', 10),
('mitra03', 'mitra03', 'Past Due Business', 'Jl. Test 3', '+628123456791', 'past_due', 10);

-- Insert test drivers (2 for mitra01 to reach limit)
INSERT OR REPLACE INTO drivers (id, user_id, mitra_id, status) VALUES
('driver01_mitra01', 'driver01', 'mitra01', 'active'),
('driver02_mitra01', 'driver02', 'mitra01', 'active');

-- Insert test invoices using current database schema
INSERT OR REPLACE INTO invoices (id, public_id, mitra_id, type, status, amount, currency, description, qris_payload, due_date, created_at) VALUES
(1, 'pub_inv01', 'mitra02', 'subscription', 'pending', 100000, 'IDR', 'Monthly subscription', '00020101021226260014ID.DANA.WWW011893600009152408240301740204740602051570030303IDR520454005802ID5914Toko Roti Enak6007Jakarta6105123456105170613INV_PLATFORM640400006304', strftime('%s', 'now', '+30 days') * 1000, strftime('%s', 'now') * 1000),
(2, 'pub_inv02', 'mitra02', 'delivery_fee', 'paid', 50000, 'IDR', 'Customer order payment', NULL, NULL, strftime('%s', 'now') * 1000),
(3, 'pub_inv03', 'mitra02', 'subscription', 'pending', 100000, 'IDR', 'Monthly subscription', '00020101021226260014ID.DANA.WWW011893600009152408240301740204740602051570030303IDR520454005802ID5914Toko Roti Enak6007Jakarta6105123456105170613INV_PLATFORM640400006304', strftime('%s', 'now', '+30 days') * 1000, strftime('%s', 'now') * 1000),
(4, 'pub_cust_inv01', 'mitra02', 'delivery_fee', 'pending', 25000, 'IDR', 'Ongkir Roti', '00020101021226260014ID.DANA.WWW011893600009152408240301740204740602051570030303IDR520454005802ID5914Toko Roti Enak6007Jakarta6105123456105170613ONGKIR_ROTI6403001063045FAC', NULL, strftime('%s', 'now') * 1000);