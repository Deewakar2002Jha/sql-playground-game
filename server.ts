import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // API Routes
  app.get('/api/assignments', (req, res) => {
    const assignments = [
      {
        id: '1',
        title: 'Basic User Retrieval',
        difficulty: 'Easy',
        description: 'Get started by fetching all users from the database. Learn the fundamentals of the SELECT statement.',
        timeEstimate: '5m',
        question: 'Write a query to select all columns from the `users` table.',
        expectedOutput: 'SELECT * FROM users',
        hints: [
          'Use the SELECT statement.',
          'Use * to select all columns.',
          'The table name is `users`.'
        ]
      },
      {
        id: '2',
        title: 'Filtering Orders',
        difficulty: 'Medium',
        description: 'Find high-value orders. Practice using the WHERE clause to filter data based on specific criteria.',
        timeEstimate: '10m',
        question: 'Select all orders where the total is greater than 50.',
        expectedOutput: 'SELECT * FROM orders WHERE total > 50',
        hints: [
          'Use the WHERE clause.',
          'Filter by the `total` column.',
          'Use the > operator.'
        ]
      },
      {
        id: '3',
        title: 'Joining Users and Orders',
        difficulty: 'Hard',
        description: 'Connect related data across tables. Master the INNER JOIN to combine user information with their order history.',
        timeEstimate: '15m',
        question: 'Select the user name and their order total for all orders.',
        expectedOutput: 'SELECT users.name, orders.total FROM users JOIN orders ON users.id = orders.user_id',
        hints: [
          'Use an INNER JOIN.',
          'Join `users` and `orders` on `user_id`.',
          'Select `name` from users and `total` from orders.'
        ]
      }
    ];
    res.json(assignments);
  });

  app.post('/api/query', (req, res) => {
    const { query } = req.body;
    try {
      const result = db.prepare(query).all();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.get('/api/schema', (req, res) => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    const schema: any = {};
    
    tables.forEach(table => {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all();
      schema[table.name] = { columns, sample };
    });

    res.json(schema);
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`Starting server in ${isProd ? 'production' : 'development'} mode`);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for SPA
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
