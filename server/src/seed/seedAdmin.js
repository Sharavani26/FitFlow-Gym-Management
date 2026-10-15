const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

async function run() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('ADMIN_EMAIL is missing or invalid in .env');
    process.exit(1);
  }
  if (password.length < 12 || password === 'REPLACE_ME') {
    console.error('ADMIN_PASSWORD must be set in .env and be at least 12 characters');
    process.exit(1);
  }

  await connectDB();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists, nothing changed:', email);
  } else {
    await User.create({
      name: 'Administrator',
      email,
      passwordHash: await User.hashPassword(password),
      role: 'admin',
    });
    console.log('Admin created:', email);
  }
  await disconnectDB();
}

run().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
