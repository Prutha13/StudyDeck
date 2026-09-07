import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix for Windows/ISP querySrv ECONNREFUSED with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set in .env');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

