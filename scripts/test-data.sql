-- Insert test users
INSERT OR REPLACE INTO users (id, google_id, email, name) VALUES 
  ('user_mitra_1', 'g_mitra_1', 'mitra1@example.com', 'Ani');

-- Insert test mitra
INSERT OR REPLACE INTO mitras (id, user_id, business_name, address, phone, subscription_status, active_driver_limit) VALUES 
  ('mitra_1', 'user_mitra_1', 'Katering Lezat Bu Ani', 'Jl. Malang No. 1', '+628123456789', 'active', 10);

-- Insert master payload types
INSERT OR REPLACE INTO master_payload_types (id, name) VALUES 
  ('mpt_makanan_panas', 'Makanan Panas');

-- Insert master vehicle types  
INSERT OR REPLACE INTO master_vehicle_types (id, name) VALUES 
  ('mvt_motor', 'Motor');

-- Insert test services
INSERT OR REPLACE INTO services (id, mitra_id, name, is_public) VALUES 
  ('service_1', 'mitra_1', 'Kurir Makanan Cepat', 1),
  ('service_private_1', 'mitra_1', 'Layanan Internal Saja', 0);

-- Insert services to payload types junction table data
INSERT OR REPLACE INTO services_to_payload_types (service_id, payload_type_id) VALUES 
  ('service_1', 'mpt_makanan_panas');

-- Insert service rates
INSERT OR REPLACE INTO service_rates (id, service_id, base_fee, fee_per_km) VALUES 
  ('rate_1', 'service_1', 5000, 2000);