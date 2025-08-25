/*
  Usage:
    1) Set in .env:
       - MONGODB_URI
       - MONGODB_DB (optional)
       - ADMIN_USERNAME (optional; default 'admin')
       - ADMIN_PASSWORD (optional; default 'ChangeMe@123')
    2) Run:
       node scripts/upsert-admin.js
*/
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load Admin model
const Admin = require(path.join(__dirname, '..', 'models', 'Admin'));

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not set in .env');
    const dbName = process.env.MONGODB_DB || undefined;

    await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);
    console.log('Connected to MongoDB');

    const username = process.env.ADMIN_USERNAME || 'admin';
    const rawPassword = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await Admin.updateOne(
      { username },
      { $set: { passwordHash } },
      { upsert: true }
    );

    console.log(`Admin upserted: ${username}`);
    console.log('You can now log in with the configured username/password.');
  } catch (e) {
    console.error('Upsert admin failed:', e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
