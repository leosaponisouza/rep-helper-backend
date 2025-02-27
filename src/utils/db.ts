import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path'; // Import the 'path' module

dotenv.config();

// Construct the absolute path to the certificate file
const caCertPath = path.resolve(__dirname, 'global-bundle.pem');

const pool = new Pool({
  user: process.env.DB_USER, // RDS Master Username
  host: process.env.DB_HOST, // RDS Endpoint
  database: process.env.DB_NAME, // RDS Database Name
  password: process.env.DB_PASSWORD, // RDS Master Password
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: true, // Important: Validate the certificate
    ca: fs.readFileSync(caCertPath).toString(), // Load the RDS CA certificate
  },
});

// Test the connection (optional but recommended)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database. Current time:', res.rows[0].now);
  }
  // Do *not* call pool.end() here if you intend to reuse the pool
});

export default pool;