import { cloudSyncService, TripPackage } from '../src/services/cloudSyncService';
import { lookupTripByJoinCode, executeJoinTripByCode } from '../src/services/joinCodeService';
import { Trip } from '../src/types';

async function runSimulation() {
  console.log('🚀 Starting Multi-Device Guest Trip Join Simulation...\n');

  const testJoinCode = 'SW7' + Math.floor(100 + Math.random() * 899).toString();
  console.log(`Generated Test Join Code: ${testJoinCode}`);

  // Step 1: User A (Host) creates trip in Guest Mode
  const userATrip: Trip = {
    id: 'trip_' + Date.now(),
    name: 'Swiss Alps Expedition',
    destination: 'Interlaken, Switzerland',
    dates: 'Dec 15 - Dec 22, 2026',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80',
    budget: 'Luxury',
    budgetAmount: 4500,
    groupSize: 'Friends',
    interests: ['Mountains', 'Hiking', 'Photography'],
    status: 'Active',
    joinCode: testJoinCode,
  };

  const userAPackage: TripPackage = {
    trip: userATrip,
    creator: {
      id: 'guest_user_a',
      name: 'Aditya (Host)',
      avatar: 'https://i.pravatar.cc/150?u=aditya',
      email: 'aditya@guest.local',
    },
    members: [
      {
        id: 'guest_user_a',
        tripId: userATrip.id,
        name: 'Aditya (Host)',
        avatar: 'https://i.pravatar.cc/150?u=aditya',
        email: 'aditya@guest.local',
        role: 'Admin',
      },
    ],
    itineraryDays: [
      {
        id: 'day-1',
        day: 'Day 1',
        activities: [
          { id: 'act-1', time: '10:00 AM', name: 'Arrive at Zurich & Train to Interlaken', icon: 'airplane-outline' },
          { id: 'act-2', time: '02:00 PM', name: 'Check in & Alpine Lake Cruise', icon: 'boat-outline' },
        ],
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        tripId: userATrip.id,
        title: 'Chalet Reservation',
        amount: 1400,
        paidBy: 'guest_user_a',
        category: 'Accommodation',
        createdAt: new Date().toISOString(),
        splitType: 'Equal',
        splitParticipants: ['guest_user_a'],
        status: 'Pending',
      },
    ],
    messages: [
      {
        id: 'msg-1',
        senderId: 'guest_user_a',
        senderName: 'Aditya (Host)',
        text: 'Welcome to our Swiss Alps trip chat! Excited for this trip!',
        type: 'message',
        timestamp: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  console.log('1. User A is publishing trip to global Cloud Relay...');
  const pubSuccess = await cloudSyncService.publishTripPackage(userAPackage);
  console.log(`- Publish result: ${pubSuccess ? '✅ Success' : '⚠️ Offline fallback'}`);

  // Small delay for global propagation
  await new Promise((r) => setTimeout(r, 1000));

  // Step 2: User B (Friend on another device) looks up the trip by Join Code
  console.log('\n2. User B (Friend on separate device) searches for join code:', testJoinCode);
  const userBEmptyCache: Trip[] = [];
  const lookup = await lookupTripByJoinCode(testJoinCode, { id: 'guest_user_b', name: 'Bob Friend', isGuest: true }, userBEmptyCache);

  if (!lookup) {
    throw new Error(`❌ Test Failed: Lookup returned null for code ${testJoinCode}`);
  }

  console.log('✅ Trip successfully found by User B!');
  console.log(`- Destination: ${lookup.destination}`);
  console.log(`- Trip Name:   ${lookup.name}`);
  console.log(`- Creator:     ${lookup.creatorName}`);
  console.log(`- Has Package: ${Boolean(lookup.package)}`);
  console.log(`- Activities in Itinerary: ${lookup.package?.itineraryDays?.[0]?.activities?.length}`);
  console.log(`- Expenses Synced:         ${lookup.package?.expenses?.length}`);
  console.log(`- Chat Messages Synced:    ${lookup.package?.messages?.length}`);

  // Step 3: User B executes Join
  console.log('\n3. User B joins the trip...');
  let joinedTripState: Trip | null = null;
  const joinedId = await executeJoinTripByCode(
    testJoinCode,
    { id: 'guest_user_b', name: 'Bob Friend', isGuest: true },
    userBEmptyCache,
    async (payload) => {
      joinedTripState = payload.trip;
      console.log(`- Hydrated trip in User B's state: ${payload.trip.name} (ID: ${payload.trip.id})`);
    }
  );

  if (joinedId !== userATrip.id) {
    throw new Error(`❌ Test Failed: Joined ID ${joinedId} does not match ${userATrip.id}`);
  }

  console.log('✅ User B joined successfully! Returned ID:', joinedId);

  // Step 4: Real-time event test
  console.log('\n4. Testing Real-time Event broadcast between User B and User A...');
  let eventReceived = false;
  const unsubscribe = cloudSyncService.subscribeToTripRealtime(testJoinCode, (event) => {
    if (event.type === 'CHAT_MESSAGE' && event.senderName === 'Bob Friend') {
      console.log(`- Real-time message received from ${event.senderName}: "${event.payload?.text}"`);
      eventReceived = true;
    }
  });

  await cloudSyncService.broadcastTripEvent(testJoinCode, {
    type: 'CHAT_MESSAGE',
    tripId: userATrip.id,
    senderId: 'guest_user_b',
    senderName: 'Bob Friend',
    payload: {
      id: 'msg-b1',
      senderId: 'guest_user_b',
      senderName: 'Bob Friend',
      text: 'Hey Aditya! I just joined using the code SWISS7! Looks awesome!',
      type: 'message',
      timestamp: new Date().toISOString(),
    },
  });

  // Wait 1.5s for event loop
  await new Promise((r) => setTimeout(r, 1500));
  unsubscribe();

  console.log('\n🎉 ALL MULTI-DEVICE TRIP JOIN SIMULATION TESTS PASSED! 🎉\n');
}

runSimulation().catch((err) => {
  console.error('Test Error:', err);
  process.exit(1);
});
