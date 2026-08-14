INSERT INTO amenities (name, description, icon_path) VALUES
('Garage', 'Private car parking space within the building', '/icons/garage.svg'),
('Rooftop Access', 'Access to shared rooftop for recreation', '/icons/rooftop.svg'),
('Elevator', 'Passenger lift service within the building', '/icons/elevator.svg'),
('Generator Backup', '24/7 generator for power outages', '/icons/generator.svg'),
('Gas Line', 'Piped gas connection for cooking', '/icons/gas.svg'),
('WASA Water', 'Municipal water supply connection', '/icons/water.svg'),
('Security Guard', 'Round the clock security personnel', '/icons/security.svg'),
('CCTV', 'Surveillance cameras in common areas', '/icons/cctv.svg'),
('Intercom', 'Intercom system between units and gate', '/icons/intercom.svg'),
('Internet Ready', 'Broadband cable infrastructure in place', '/icons/wifi.svg'),
('Prayer Room', 'Dedicated prayer space within the building', '/icons/prayer.svg'),
('Fire Safety', 'Fire extinguishers and safety measures in place', '/icons/fire_safety.svg'),
('Swimming Pool', 'Access to shared swimming pool', '/icons/pool.svg'),
('Gym', 'Access to shared fitness center', '/icons/gym.svg'),
('Playground', 'Outdoor play area for children', '/icons/playground.svg'),
('Community Hall', 'Shared hall for events and gatherings', '/icons/community_hall.svg'),
('Solar panels', 'Solar energy system for electricity', '/icons/solar.svg')
ON CONFLICT (name) DO NOTHING;

INSERT INTO areas (name, city, latitude, longitude, radius) VALUES
('Azimpur', 'Dhaka', 23.7298, 90.3854, 500),
('Dhanmondi', 'Dhaka', 23.7450, 90.3767, 500),
('Mohammadpur', 'Dhaka', 23.7664, 90.3586, 500),
('Gulshan', 'Dhaka', 23.7917, 90.4167, 500),
('Banani', 'Dhaka', 23.7950, 90.4047, 500),
('Mirpur', 'Dhaka', 23.8046, 90.3631, 500),
('Khilkhet', 'Dhaka', 23.8311, 90.4243, 500),
('Uttara', 'Dhaka', 23.8770, 90.3770, 500),
('Bashundhara', 'Dhaka', 23.8167, 90.4326, 500),
('Tejgaon', 'Dhaka', 23.7640, 90.3917, 500),
('Lalbagh', 'Dhaka', 23.7198, 90.3897, 500),
('Badda', 'Dhaka', 23.7716, 90.4274, 500)
ON CONFLICT (name) DO NOTHING;