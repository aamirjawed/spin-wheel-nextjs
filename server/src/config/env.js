import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to this file's directory (server/src/config/env.js -> server/.env)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

console.log('Environment variables initialized.');
