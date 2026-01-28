-- Create Database
CREATE DATABASE IF NOT EXISTS food_delivery_db;
USE food_delivery_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  password VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rating FLOAT,
  delivery_time VARCHAR(50),
  delivery_fee DECIMAL(10, 2),
  image VARCHAR(255),
  address VARCHAR(255),
  phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food Items Table
CREATE TABLE IF NOT EXISTS food_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  restaurant_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image VARCHAR(255),
  category VARCHAR(50),
  available BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  restaurant_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  delivery_address VARCHAR(255),
  phone VARCHAR(15),
  status ENUM('pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  food_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- Sample Data - Restaurants
INSERT INTO restaurants (name, description, rating, delivery_time, delivery_fee, image, address, phone) VALUES
('Pizza Palace', 'Delicious Italian pizzas and pasta', 4.5, '30-40 mins', 2.99, 'https://via.placeholder.com/200?text=Pizza+Palace', '123 Main St', '555-0101'),
('Burger Barn', 'Fresh burgers and fries', 4.3, '20-30 mins', 1.99, 'https://via.placeholder.com/200?text=Burger+Barn', '456 Oak Ave', '555-0102'),
('Sushi Heaven', 'Fresh sushi and asian cuisine', 4.7, '35-45 mins', 3.99, 'https://via.placeholder.com/200?text=Sushi+Heaven', '789 Pine Rd', '555-0103'),
('Taco Fiesta', 'Authentic Mexican food', 4.4, '25-35 mins', 2.49, 'https://via.placeholder.com/200?text=Taco+Fiesta', '321 Elm St', '555-0104');

-- Sample Data - Food Items for Pizza Palace
INSERT INTO food_items (restaurant_id, name, description, price, image, category) VALUES
(1, 'Margherita Pizza', 'Classic pizza with tomato, mozzarella and basil', 12.99, 'https://via.placeholder.com/200?text=Margherita', 'Pizza'),
(1, 'Pepperoni Pizza', 'Pizza with pepperoni and cheese', 14.99, 'https://via.placeholder.com/200?text=Pepperoni', 'Pizza'),
(1, 'Spaghetti Carbonara', 'Classic Italian pasta', 11.99, 'https://via.placeholder.com/200?text=Spaghetti', 'Pasta');

-- Sample Data - Food Items for Burger Barn
INSERT INTO food_items (restaurant_id, name, description, price, image, category) VALUES
(2, 'Classic Burger', 'Beef burger with lettuce, tomato, and sauce', 9.99, 'https://via.placeholder.com/200?text=Classic+Burger', 'Burger'),
(2, 'Double Burger', 'Double patty burger with cheese', 12.99, 'https://via.placeholder.com/200?text=Double+Burger', 'Burger'),
(2, 'French Fries', 'Golden crispy fries', 3.99, 'https://via.placeholder.com/200?text=Fries', 'Sides');

-- Sample Data - Food Items for Sushi Heaven
INSERT INTO food_items (restaurant_id, name, description, price, image, category) VALUES
(3, 'California Roll', 'Crab, avocado and cucumber', 8.99, 'https://via.placeholder.com/200?text=California+Roll', 'Sushi'),
(3, 'Salmon Nigiri', 'Fresh salmon sushi', 10.99, 'https://via.placeholder.com/200?text=Salmon+Nigiri', 'Sushi'),
(3, 'Tempura', 'Fried shrimp tempura', 9.99, 'https://via.placeholder.com/200?text=Tempura', 'Other');

-- Sample Data - Food Items for Taco Fiesta
INSERT INTO food_items (restaurant_id, name, description, price, image, category) VALUES
(4, 'Beef Tacos', 'Three tacos with seasoned beef', 7.99, 'https://via.placeholder.com/200?text=Beef+Tacos', 'Tacos'),
(4, 'Chicken Quesadilla', 'Grilled tortilla with chicken and cheese', 8.99, 'https://via.placeholder.com/200?text=Quesadilla', 'Quesadilla'),
(4, 'Guacamole Dip', 'Fresh guacamole with chips', 4.99, 'https://via.placeholder.com/200?text=Guacamole', 'Dip');
