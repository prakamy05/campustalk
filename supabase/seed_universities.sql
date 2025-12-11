insert into universities (name, domain, logo_url, state, city) values
('IIT Bombay','iitb.ac.in','https://images.unsplash.com/photo-1523050854058-8df90110c9f1','Maharashtra','Mumbai'),
('IIT Delhi','iitd.ac.in','https://images.unsplash.com/photo-1523050854058-8df90110c9f1','Delhi','New Delhi'),
('BITS Pilani','bits-pilani.ac.in','https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d','Rajasthan','Pilani'),
('Mumbai University','mu.ac.in','https://images.unsplash.com/photo-1507209696990-7f9906b1d1b8','Maharashtra','Mumbai')
ON CONFLICT DO NOTHING;
