/**
 * Character set excluding easily confused characters:
 * Excluded: '0', 'O', '1', 'I', 'L'
 * Total characters: 31
 */
export const JOIN_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;

/**
 * Generates a random 6-character uppercase alphanumeric join code.
 */
export const generateRawJoinCode = (length = JOIN_CODE_LENGTH): string => {
  let result = '';
  const charsetLength = JOIN_CODE_CHARSET.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength);
    result += JOIN_CODE_CHARSET[randomIndex];
  }
  return result;
};

/**
 * Generates a join code guaranteed to be unique within a provided list of existing codes.
 */
export const generateUniqueJoinCode = (existingCodes: (string | undefined)[] = []): string => {
  const existingSet = new Set(
    existingCodes
      .filter((c): c is string => Boolean(c))
      .map(c => normalizeJoinCode(c))
  );

  let code = generateRawJoinCode();
  let attempts = 0;
  while (existingSet.has(code) && attempts < 50) {
    code = generateRawJoinCode();
    attempts++;
  }
  return code;
};

/**
 * Cleans and normalizes user input join codes:
 * - Trims whitespace
 * - Converts to uppercase
 * - Strips dashes, spaces, and non-alphanumeric characters
 */
export const normalizeJoinCode = (rawCode: string = ''): string => {
  return rawCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

/**
 * Validates whether a given string is a valid format for a trip join code (6 alphanumeric characters).
 */
export const isValidJoinCode = (code: string): boolean => {
  const normalized = normalizeJoinCode(code);
  return normalized.length === JOIN_CODE_LENGTH && /^[A-Z0-9]{6}$/.test(normalized);
};


/**
 * Formats a friendly invite message for sharing with friends.
 */
export const formatTripInviteMessage = (
  trip: { name?: string; destination: string; dates?: string },
  joinCode: string
): string => {
  const title = trip.name || `Trip to ${trip.destination}`;
  const dates = trip.dates ? `\n📅 Dates: ${trip.dates}` : '';
  
  return (
    `✈️ Join my trip to ${trip.destination} on Travora!\n\n` +
    `🗺️ Trip: ${title}${dates}\n` +
    `🔑 Join Code: ${joinCode}\n\n` +
    `How to join:\n` +
    `1. Open the Travora app\n` +
    `2. Go to Trips > Tap Join Trip\n` +
    `3. Enter code "${joinCode}" to jump in!`
  );
};
