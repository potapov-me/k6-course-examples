#!/usr/bin/env node

/**
 * Generator тестовых данных для k6
 * Использует faker.js для realistic данных
 *
 * Usage:
 * node generate-data.js --users 10000 --products 1000
 */

const fs = require('fs');
const { faker } = require('@faker-js/faker');

// Парсинг аргументов
const args = process.argv.slice(2);
const config = {
  users: 10000,
  products: 1000,
  addresses: 5000,
};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = parseInt(args[i + 1], 10);
  if (config.hasOwnProperty(key)) {
    config[key] = value;
  }
}

console.log('🎲 Generating test data...');
console.log('Config:', config);

// Генерация пользователей
function generateUsers(count) {
  const users = [];

  for (let i = 0; i < count; i++) {
    users.push({
      id: i + 1,
      email: `test${i + 1}@example.com`,
      password: 'Test123!', // Все одинаковый пароль для простоты
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: faker.location.country(),
      },
      role: i < 10 ? 'admin' : 'customer', // Первые 10 = admin
      createdAt: faker.date.past({ years: 2 }).toISOString(),
    });

    if ((i + 1) % 1000 === 0) {
      console.log(`  Generated ${i + 1} users...`);
    }
  }

  return users;
}

// Генерация товаров
function generateProducts(count) {
  const products = [];
  const categories = ['Electronics', 'Computers', 'Audio', 'Wearables', 'Accessories', 'Gaming'];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];

    products.push({
      id: i + 1,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 2000 })),
      category: category,
      brand: faker.company.name(),
      sku: faker.string.alphanumeric(10).toUpperCase(),
      stock: faker.number.int({ min: 0, max: 100 }),
      imageUrl: `https://via.placeholder.com/300x300?text=Product+${i + 1}`,
      rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0
      reviews: faker.number.int({ min: 0, max: 500 }),
      createdAt: faker.date.past({ years: 1 }).toISOString(),
    });

    if ((i + 1) % 100 === 0) {
      console.log(`  Generated ${i + 1} products...`);
    }
  }

  return products;
}

// Генерация адресов
function generateAddresses(count) {
  const addresses = [];

  for (let i = 0; i < count; i++) {
    addresses.push({
      id: i + 1,
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      country: faker.location.country(),
      type: i % 3 === 0 ? 'billing' : 'shipping',
    });

    if ((i + 1) % 1000 === 0) {
      console.log(`  Generated ${i + 1} addresses...`);
    }
  }

  return addresses;
}

// Генерация
console.log('\n📦 Generating users...');
const users = generateUsers(config.users);
fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
console.log(`✅ Generated ${users.length} users → users.json`);

console.log('\n📦 Generating products...');
const products = generateProducts(config.products);
fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
console.log(`✅ Generated ${products.length} products → products.json`);

console.log('\n📦 Generating addresses...');
const addresses = generateAddresses(config.addresses);
fs.writeFileSync('addresses.json', JSON.stringify(addresses, null, 2));
console.log(`✅ Generated ${addresses.length} addresses → addresses.json`);

// Статистика
const usersSizeMB = (fs.statSync('users.json').size / 1024 / 1024).toFixed(2);
const productsSizeMB = (fs.statSync('products.json').size / 1024 / 1024).toFixed(2);
const addressesSizeMB = (fs.statSync('addresses.json').size / 1024 / 1024).toFixed(2);

console.log('\n📊 Summary:');
console.log(`  users.json: ${usersSizeMB} MB`);
console.log(`  products.json: ${productsSizeMB} MB`);
console.log(`  addresses.json: ${addressesSizeMB} MB`);
console.log(`  Total: ${(parseFloat(usersSizeMB) + parseFloat(productsSizeMB) + parseFloat(addressesSizeMB)).toFixed(2)} MB`);
console.log('\n✨ Done!');
