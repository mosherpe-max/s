
/**
 * @fileOverview Automated test pipeline for Stripe Onboarding Logic.
 * Seeds emulator data, invokes the callable function, and verifies Firestore state.
 */

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable, getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { signInWithEmailAndPassword, getAuth, connectAuthEmulator } from 'firebase/auth';

async function runStripePipelineTest() {
  console.log('🚀 INITIALIZING STRIPE PIPELINE TEST...');

  // 1. Initialize SDKs (Client-side simulation)
  const { firebaseApp, firestore, auth } = initializeFirebase();
  const functions = getFunctions(firebaseApp, 'us-central1');

  // Point to Emulators
  // Note: These usually auto-detect if the env is local, but we'll be explicit
  // connectFunctionsEmulator(functions, 'localhost', 5001);

  const MOCK_VENUE_ID = 'test_golf_course_1';
  const MOCK_OWNER_UID = 'mock-manager-123';

  try {
    // 2. Setup Mock Data in Firestore
    console.log('📋 STEP 1: Seeding mock venue document...');
    const venueRef = doc(firestore, 'venues', MOCK_VENUE_ID);
    await setDoc(venueRef, {
      venueId: MOCK_VENUE_ID,
      name: 'Test Golf Course',
      ownerUid: MOCK_OWNER_UID,
      stripeAccountId: null,
      stripeConnectVerified: false,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Mock document created.');

    // 3. Simulate Authenticated Context
    // In a real emulator test, you'd use a mock token or sign in.
    // For this script, we'll assume the environment is configured to allow the call
    // or we'd use the Functions shell. 
    
    console.log('📞 STEP 2: Invoking initializeVenueStripeOnboarding...');
    const initializeOnboarding = httpsCallable(functions, 'initializeVenueStripeOnboarding');
    
    // We pass the venueId. The function will check request.auth.
    // NOTE: This test requires a valid Stripe Secret Key in functions/.env or shell env to succeed.
    const result = await initializeOnboarding({ venueId: MOCK_VENUE_ID });
    const data = result.data as { url: string };

    console.log('\n--- TEST RESULTS ---');
    
    // 4. Verify Returned Payload
    if (data.url && data.url.includes('stripe.com')) {
      console.log('✅ SUCCESS: Valid Stripe Onboarding URL generated:');
      console.log(`🔗 ${data.url}`);
    } else {
      console.log('❌ FAILURE: Invalid or missing URL in response.');
    }

    // 5. Verify Firestore State Change
    const updatedDoc = await getDoc(venueRef);
    const stripeId = updatedDoc.data()?.stripeAccountId;

    if (stripeId && stripeId.startsWith('acct_')) {
      console.log(`✅ SUCCESS: Firestore updated! New stripeAccountId: ${stripeId}`);
    } else {
      console.log('❌ FAILURE: Firestore field "stripeAccountId" was not updated properly.');
    }
    
    console.log('--------------------\n');

  } catch (error: any) {
    console.error('💥 PIPELINE CRASHED:', error.message);
    if (error.details) console.error('Details:', error.details);
    console.log('\n💡 Tip: Ensure the Emulator is running and your STRIPE_SECRET_KEY is set in functions/.env');
  }
}

runStripePipelineTest();
