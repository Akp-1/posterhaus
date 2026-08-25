const mongoose = require('mongoose');
require('dotenv').config();

const posterSchema = new mongoose.Schema({
  posterId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  file: { type: String, required: true },
  price: { type: Number, default: 49 },
  category: { type: String, default: 'General' },
  tags: [String],
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Poster = mongoose.model('Poster', posterSchema);

async function initMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/posterhaus');
    console.log('MongoDB (NoSQL) Connected.');
    
    // Seed data if empty
    const count = await Poster.countDocuments();
    if (count === 0) {
      console.log('Seeding initial poster metadata to MongoDB...');
      // This will be populated by the server when it scans the posters folder
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

async function upsertPoster(posterData) {
  return await Poster.findOneAndUpdate(
    { file: posterData.file },
    posterData,
    { upsert: true, returnDocument: 'after' }
  );
}

async function getPosterByFile(file) {
  return await Poster.findOne({ file });
}

async function getAllPosters() {
  return await Poster.find({});
}

async function updatePosterMeta(file, data) {
  return await Poster.findOneAndUpdate({ file }, data, { returnDocument: 'after' });
}

module.exports = {
  initMongo,
  Poster,
  upsertPoster,
  getPosterByFile,
  getAllPosters,
  updatePosterMeta
};
