import Database from 'better-sqlite3';

let db: any;
try {
  db = new Database('practice.db');
  console.log('Database connected successfully');
} catch (err) {
  console.error('Database connection failed:', err);
  // Fallback to in-memory if file-based fails
  db = new Database(':memory:');
  console.log('Using in-memory database as fallback');
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const users = [
    ['Alice Smith', 'alice@example.com'],
    ['Bob Johnson', 'bob@example.com'],
    ['Charlie Brown', 'charlie@example.com'],
    ['Diana Prince', 'diana@example.com'],
    ['Ethan Hunt', 'ethan@example.com'],
    ['Fiona Gallagher', 'fiona@example.com'],
    ['George Costanza', 'george@example.com'],
    ['Hannah Abbott', 'hannah@example.com'],
    ['Ian Malcolm', 'ian@example.com'],
    ['Jane Doe', 'jane@example.com'],
  ];

  const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  users.forEach(user => insertUser.run(user[0], user[1]));

  const insertOrder = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)');
  for (let i = 1; i <= 20; i++) {
    const userId = Math.floor(Math.random() * 10) + 1;
    const total = (Math.random() * 100 + 10).toFixed(2);
    insertOrder.run(userId, total);
  }
}

export default db;
