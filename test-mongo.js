const mongoose = require('mongoose');
const mongoDb = require('./mongoDb');

async function test() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect('mongodb://localhost:27017/posterhaus');
    console.log('Connected successfully.');

    console.log('Creating a test poster entry...');
    await mongoDb.upsertPoster({
      posterId: 'TEST-001',
      name: 'Test Poster',
      file: 'test.jpg',
      price: 60,
      isAvailable: true
    });

    console.log('Data written! You should now see the "posterhaus" database and "posters" collection in MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

test();
