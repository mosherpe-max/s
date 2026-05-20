/**
 * @fileOverview Automated test pipeline for Stripe Onboarding Logic.
 * Seeds emulator data, invokes the callable function, and verifies Firestore state.
 */

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';

async function runStripePipelineTest() {
  console.log('🚀 INITIALIZING STRIPE PIPELINE TEST...');

  // 1. Initialize SDKs
  const { firebaseApp, firestore, auth } = initializeFirebase();
  const functions = getFunctions(firebaseApp, 'us-central1');

  const MOCK_VENUE_ID = 'test_golf_course_1';
  
  try {
    // 2. Sign In to provide auth context
    console.log('🔑 STEP 1: Signing in anonymously...');
    const userCredential = await signInAnonymously(auth);
    const mockUid = userCredential.user.uid;
    console.log(`✅ Signed in as: ${mockUid}`);

    // 3. Setup Mock Data in Firestore
    console.log(`📋 STEP 2: Seeding mock venue document for owner ${mockUid}...`);
    const venueRef = doc(firestore, 'venues', MOCK_VENUE_ID);
    
    // Clean up old test data if exists
    await deleteDoc(venueRef);

    await setDoc(venueRef, {
      venueId: MOCK_VENUE_ID,
      name: 'Test Golf Course',
      ownerUid: mockUid,
      stripeAccountId: null,
      stripeConnectVerified: false,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Mock document created.');

    // 4. Invoke the Function
    console.log('📞 STEP 3: Invoking initializeVenueStripeOnboarding...');
    const initializeOnboarding = httpsCallable(functions, 'initializeVenueStripeOnboarding');
    
    const result = await initializeOnboarding({ venueId: MOCK_VENUE_ID });
    const data = result.data as { url: string };

    console.log('\n--- TEST RESULTS ---');
    
    // 5. Verify Returned Payload
    if (data.url && (data.url.includes('stripe.com') || data.url.includes('example.com'))) {
      console.log('✅ SUCCESS: Valid Stripe Onboarding URL generated:');
      console.log(`🔗 ${data.url}`);
    } else {
      console.log('❌ FAILURE: Invalid or missing URL in response.');
      console.log('Payload received:', JSON.stringify(data, null, 2));
    }

    // 6. Verify Firestore State Change
    const updatedDoc = await getDoc(venueRef);
    const stripeId = updatedDoc.data()?.stripeAccountId;

    if (stripeId && stripeId.startsWith('acct_')) {
      console.log(`✅ SUCCESS: Firestore updated! New stripeAccountId: ${stripeId}`);
    } else {
      console.log('❌ FAILURE: Firestore field "stripeAccountId" was not updated properly.');
      console.log('Current Doc Data:', JSON.stringify(updatedDoc.data(), null, 2));
    }
    
    console.log('--------------------\n');

  } catch (error: any) {
    console.error('💥 PIPELINE CRASHED:', error.message);
    if (error.details) console.error('Details:', error.details);
    console.log('\n💡 Tip: If you get a "STRIPE_SECRET_KEY" error, ensure you have a "functions/.env" file with your sk_test_... key.');
  }
}

runStripePipelineTest();
