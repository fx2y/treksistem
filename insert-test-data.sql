-- Insert test users
INSERT OR REPLACE INTO users (id, google_id, email, name, avatar_url, role, created_at) VALUES 
('user_mitra_1', 'google_mitra_1', 'mitra1@example.com', 'Mitra 1', NULL, 'user', datetime('now')),
('user_mitra_2', 'google_mitra_2', 'mitra2@example.com', 'Mitra 2', NULL, 'user', datetime('now')),
('user_driver_1', 'google_driver_1', 'driver1@example.com', 'Budi Santoso', NULL, 'user', datetime('now'));

-- Insert test mitras
INSERT OR REPLACE INTO mitras (id, user_id, business_name, address, phone, subscription_status, active_driver_limit) VALUES 
('mitra_1', 'user_mitra_1', 'Katering Bu Ani', 'Jl. Test 1', '+628123456789', 'active', 10),
('mitra_2', 'user_mitra_2', 'Toko Roti Lezat', 'Jl. Test 2', '+628123456790', 'active', 5);

-- Clean up any existing driver invites and drivers for clean testing
DELETE FROM driver_invites WHERE mitra_id IN ('mitra_1', 'mitra_2');
DELETE FROM drivers WHERE mitra_id IN ('mitra_1', 'mitra_2');