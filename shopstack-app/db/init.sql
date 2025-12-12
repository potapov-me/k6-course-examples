-- ShopStack Database Schema
-- Auto-initialized when PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uuid ON users(uuid);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);

-- Inventory table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id)
);

CREATE INDEX idx_inventory_product ON inventory(product_id);

-- Carts table
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'checked_out')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_status ON carts(status);

-- Cart items table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_snapshot DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cart_id INTEGER REFERENCES carts(id),
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    method VARCHAR(50) CHECK (method IN ('card', 'paypal', 'bank_transfer')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Inventory reservations table
CREATE TABLE inventory_reservations (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'released', 'committed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_product ON inventory_reservations(product_id);
CREATE INDEX idx_reservations_cart ON inventory_reservations(cart_id);
CREATE INDEX idx_reservations_expires ON inventory_reservations(expires_at);

-- Insert test users (100 users)
INSERT INTO users (email, password_hash, name, role)
SELECT
    'test' || i || '@example.com',
    '$2b$10$YourHashedPasswordHere',  -- bcrypt hash of 'Test123!'
    'Test User ' || i,
    CASE WHEN i <= 5 THEN 'admin' ELSE 'customer' END
FROM generate_series(1, 100) AS i;

-- Insert test products (1000 products)
INSERT INTO products (name, description, price, category, image_url)
SELECT
    CASE (i % 10)
        WHEN 0 THEN 'Laptop Pro ' || i
        WHEN 1 THEN 'Smartphone X' || i
        WHEN 2 THEN 'Headphones Premium ' || i
        WHEN 3 THEN 'Smartwatch Ultra ' || i
        WHEN 4 THEN 'Tablet Air ' || i
        WHEN 5 THEN 'Camera DSLR ' || i
        WHEN 6 THEN 'Gaming Console ' || i
        WHEN 7 THEN 'Wireless Mouse ' || i
        WHEN 8 THEN 'Mechanical Keyboard ' || i
        ELSE 'USB-C Hub ' || i
    END,
    'High-quality product with excellent features and performance.',
    (50 + (random() * 1950))::DECIMAL(10, 2),
    CASE (i % 5)
        WHEN 0 THEN 'Electronics'
        WHEN 1 THEN 'Computers'
        WHEN 2 THEN 'Audio'
        WHEN 3 THEN 'Wearables'
        ELSE 'Accessories'
    END,
    'https://via.placeholder.com/300x300?text=Product+' || i
FROM generate_series(1, 1000) AS i;

-- Insert inventory for all products
INSERT INTO inventory (product_id, quantity, reserved)
SELECT
    id,
    (random() * 100)::INTEGER,  -- Random quantity 0-100
    0
FROM products;

-- Insert some active carts for test users (50 carts)
INSERT INTO carts (user_id, status)
SELECT
    (random() * 100 + 1)::INTEGER,
    CASE WHEN random() < 0.8 THEN 'active' ELSE 'abandoned' END
FROM generate_series(1, 50);

-- Insert cart items (2-5 items per cart)
INSERT INTO cart_items (cart_id, product_id, quantity, price_snapshot)
SELECT
    c.id,
    (random() * 1000 + 1)::INTEGER,
    (random() * 3 + 1)::INTEGER,
    p.price
FROM carts c
CROSS JOIN LATERAL (
    SELECT id, price
    FROM products
    ORDER BY random()
    LIMIT (random() * 4 + 2)::INTEGER
) p
WHERE c.status = 'active';

-- Insert completed orders (100 orders)
INSERT INTO orders (user_id, cart_id, total, status, payment_id)
SELECT
    (random() * 100 + 1)::INTEGER,
    NULL,
    (random() * 500 + 50)::DECIMAL(10, 2),
    CASE (random() * 5)::INTEGER
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'paid'
        WHEN 2 THEN 'processing'
        WHEN 3 THEN 'shipped'
        ELSE 'delivered'
    END,
    'pay_' || md5(random()::TEXT)
FROM generate_series(1, 100);

-- Insert payments for orders
INSERT INTO payments (order_id, amount, method, status, transaction_id)
SELECT
    o.id,
    o.total,
    CASE (random() * 3)::INTEGER
        WHEN 0 THEN 'card'
        WHEN 1 THEN 'paypal'
        ELSE 'bank_transfer'
    END,
    CASE o.status
        WHEN 'pending' THEN 'pending'
        WHEN 'paid' THEN 'completed'
        ELSE 'completed'
    END,
    'txn_' || md5(random()::TEXT)
FROM orders o;

-- Create view for product availability
CREATE VIEW product_availability AS
SELECT
    p.id,
    p.uuid,
    p.name,
    p.price,
    p.category,
    i.quantity AS stock_quantity,
    i.reserved AS reserved_quantity,
    (i.quantity - i.reserved) AS available_quantity
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id;

-- Create function to update inventory
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_inventory_timestamp
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

CREATE TRIGGER update_carts_timestamp
    BEFORE UPDATE ON carts
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shopstack;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shopstack;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO shopstack;

-- Vacuum and analyze
VACUUM ANALYZE;
