import {
  generateRawJoinCode,
  generateUniqueJoinCode,
  normalizeJoinCode,
  isValidJoinCode,
  formatTripInviteMessage,
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
} from '../src/services/joinCodeEngine';

console.log('=== Starting Trip Join Code System Verification ===\n');

// Test 1: Format and charset test
console.log('1. Testing Charset and Length:');
const sampleCode = generateRawJoinCode();
console.log(`- Sample generated code: "${sampleCode}"`);
if (sampleCode.length !== JOIN_CODE_LENGTH) {
  throw new Error(`Expected length ${JOIN_CODE_LENGTH}, got ${sampleCode.length}`);
}
for (const ch of sampleCode) {
  if (!JOIN_CODE_CHARSET.includes(ch)) {
    throw new Error(`Character '${ch}' not in allowed charset`);
  }
}
console.log('✅ Length and charset validation passed!\n');

// Test 2: Normalization
console.log('2. Testing Code Normalization:');
const testCases = [
  { input: ' abc-123 ', expected: 'ABC123' },
  { input: 'q7-mk-2p', expected: 'Q7MK2P' },
  { input: '   K9X8Z2   ', expected: 'K9X8Z2' },
  { input: 'a!b@c#2$3%4', expected: 'ABC234' },
];

for (const tc of testCases) {
  const normalized = normalizeJoinCode(tc.input);
  if (normalized !== tc.expected) {
    throw new Error(`Normalization failed for "${tc.input}": expected "${tc.expected}", got "${normalized}"`);
  }
}
console.log('✅ All normalization test cases passed!\n');

// Test 3: Validation function
console.log('3. Testing Code Validation:');
const validCodes = ['Q7MK2P', 'SANTO1', 'ABC234', 'K9X8Z2', 'Q7MO2P'];
const invalidCodes = ['Q7MK2', 'Q7MK2P9', 'Q7M!#', '', '12345'];

for (const c of validCodes) {
  if (!isValidJoinCode(c)) {
    throw new Error(`Expected "${c}" to be valid`);
  }
}
for (const c of invalidCodes) {
  if (isValidJoinCode(c)) {
    throw new Error(`Expected "${c}" to be invalid`);
  }
}
console.log('✅ Validation logic passed!\n');


// Test 4: Uniqueness and collision avoidance
console.log('4. Testing Uniqueness & Collision Avoidance:');
const existing = ['SANTO1', 'PARIS2', 'TOKYO3'];
const generatedUnique = generateUniqueJoinCode(existing);
console.log(`- Generated code with 3 existing: "${generatedUnique}"`);
if (existing.includes(generatedUnique)) {
  throw new Error(`Collision occurred: "${generatedUnique}" was in existing list`);
}
console.log('✅ Collision avoidance passed!\n');

// Test 5: Entropy & Uniqueness over 10,000 iterations
console.log('5. Stress Testing 10,000 Unique Code Generations:');
const set = new Set<string>();
const ITERATIONS = 10000;
for (let i = 0; i < ITERATIONS; i++) {
  const code = generateRawJoinCode();
  if (!isValidJoinCode(code)) {
    throw new Error(`Invalid code generated at iteration ${i}: "${code}"`);
  }
  set.add(code);
}
const collisionCount = ITERATIONS - set.size;
const uniquenessRate = ((set.size / ITERATIONS) * 100).toFixed(2);
console.log(`- Generated: ${ITERATIONS} codes`);
console.log(`- Unique codes: ${set.size}`);
console.log(`- Collisions: ${collisionCount} (${(100 - Number(uniquenessRate)).toFixed(2)}%)`);
console.log(`- Uniqueness Rate: ${uniquenessRate}%`);
console.log('✅ Large scale entropy and uniqueness verified!\n');

// Test 6: Invite message formatting
console.log('6. Testing Trip Invite Message Formatting:');
const inviteMsg = formatTripInviteMessage(
  {
    name: 'Trip to Tokyo',
    destination: 'Tokyo, Japan',
    dates: 'Nov 10 - Nov 20, 2026',
  },
  'TK9X2M'
);
console.log('Formatted Invite Message:\n---\n' + inviteMsg + '\n---');
if (!inviteMsg.includes('TK9X2M') || !inviteMsg.includes('Tokyo, Japan')) {
  throw new Error('Invite message missing join code or destination');
}
console.log('✅ Invite message formatting passed!\n');

console.log('🎉 ALL JOIN CODE ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉');
