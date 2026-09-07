import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requirePlan } from '../middleware/requirePlan.middleware.js';

async function testPlanGating() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/studydeck';
  await mongoose.connect(mongoUri);

  console.log('\n--- 1. Testing User Model Plan Virtual ---');
  const freeUser = await User.findOne({ email: 'free@studydeck.test' });
  const proUser = await User.findOne({ email: 'pro@studydeck.test' });

  console.log(`Free user plan: "${freeUser.plan}", isPremium(): ${freeUser.isPremium()}`);
  console.log(`Pro user plan: "${proUser.plan}", isPremium(): ${proUser.isPremium()}`);

  if (freeUser.plan !== 'free') throw new Error('freeUser.plan should be free');
  if (proUser.plan !== 'pro') throw new Error('proUser.plan should be pro');

  console.log('\n--- 2. Testing requirePlan Middleware with Free User ---');
  let freeStatus = null;
  let freeBody = null;
  const mockReqFree = {
    user: { id: freeUser._id.toString(), plan: freeUser.plan, isPremium: freeUser.isPremium() }
  };
  const mockResFree = {
    status(code) {
      freeStatus = code;
      return this;
    },
    json(data) {
      freeBody = data;
      return this;
    }
  };
  let freeNextCalled = false;
  const middleware = requirePlan('pro');

  await middleware(mockReqFree, mockResFree, () => {
    freeNextCalled = true;
  });

  console.log('Free user status code:', freeStatus);
  console.log('Free user response body:', freeBody);
  console.log('Was next() called for free user?', freeNextCalled);

  if (freeStatus !== 403 || freeNextCalled) {
    throw new Error(`Expected free user to receive 403, got ${freeStatus}`);
  }
  if (!freeBody?.upgradeRequired) {
    throw new Error('Expected upgradeRequired: true in 403 response');
  }

  console.log('\n--- 3. Testing requirePlan Middleware with Pro User ---');
  let proStatus = null;
  let proBody = null;
  const mockReqPro = {
    user: { id: proUser._id.toString(), plan: proUser.plan, isPremium: proUser.isPremium() }
  };
  const mockResPro = {
    status(code) {
      proStatus = code;
      return this;
    },
    json(data) {
      proBody = data;
      return this;
    }
  };
  let proNextCalled = false;

  await middleware(mockReqPro, mockResPro, () => {
    proNextCalled = true;
  });

  console.log('Was next() called for pro user?', proNextCalled);
  if (!proNextCalled || proStatus === 403) {
    throw new Error(`Expected pro user to pass through to next(), but was blocked with status ${proStatus}`);
  }

  console.log('\n--- 4. Testing requirePlan with direct middleware syntax requirePlan ---');
  let proNextCalledDirect = false;
  await requirePlan(mockReqPro, mockResPro, () => {
    proNextCalledDirect = true;
  });
  console.log('Was next() called with direct requirePlan syntax?', proNextCalledDirect);
  if (!proNextCalledDirect) {
    throw new Error('Direct requirePlan syntax failed');
  }

  console.log('\n✅ All plan gating tests passed successfully!');
  await mongoose.disconnect();
}

testPlanGating().catch((err) => {
  console.error('Plan gating test failed:', err);
  process.exit(1);
});

