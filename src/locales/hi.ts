const hi = {
  // ── Navigation ──────────────────────────────────────────────────
  nav: {
    home: 'होम',
    trips: 'यात्राएं',
    expenses: 'खर्चे',
    profile: 'प्रोफ़ाइल',
  },

  // ── Home Screen ─────────────────────────────────────────────────
  home: {
    greeting: 'सुप्रभात,',
    searchPlaceholder: 'आप कहाँ जा रहे हैं?',
    upcomingTrip: 'आगामी यात्रा',
    startJourney: 'अपनी यात्रा शुरू करें',
    popularDestinations: 'लोकप्रिय गंतव्य',
    seeAll: 'सभी देखें',
    upcoming: 'आगामी',
    noTripsTitle: 'अभी तक कोई यात्रा नहीं',
    noTripsSub: 'अपनी पहली यात्रा बनाएं और दुनिया की खोज शुरू करें!',
    createTrip: 'यात्रा बनाएं',
    createNewTrip: 'नई यात्रा बनाएं',
    startingFrom: 'शुरुआत से',
  },

  // ── Create Trip Screen ───────────────────────────────────────────
  createTrip: {
    title: 'नई यात्रा बनाएं',
    whereTo: 'कहाँ जाएं?',
    enterDestination: 'गंतव्य दर्ज करें',
    startDate: 'शुरुआत की तारीख',
    endDate: 'समाप्ति तारीख',
    budget: 'बजट',
    groupSize: 'समूह का आकार',
    interests: 'रुचियाँ',
    continue: 'जारी रखें',
    done: 'हो गया',
    invalidDate: 'अमान्य तारीख',
    invalidDateMsg: 'समाप्ति तारीख शुरुआत से पहले नहीं हो सकती।',
    enterDestinationAlert: 'कृपया गंतव्य दर्ज करें',
  },

  // ── Trip Details Screen ──────────────────────────────────────────
  tripDetails: {
    travelBuddies: 'यात्रा साथी',
    total: 'कुल',
    budgetSummary: 'बजट सारांश',
    totalBudget: 'कुल बजट',
    remaining: 'शेष',
    itineraryPreview: 'यात्रा कार्यक्रम पूर्वावलोकन',
    viewFull: 'पूरा देखें',
    preview: 'पूर्वावलोकन',
    noItinerary: 'अभी तक कोई यात्रा कार्यक्रम नहीं। AI से बनाने के लिए टैप करें!',
    generateAI: 'AI यात्रा कार्यक्रम बनाएं',
    editAI: 'AI यात्रा कार्यक्रम संपादित करें',
  },

  // ── AI Itinerary Screen ──────────────────────────────────────────
  itinerary: {
    title: 'आपका स्मार्ट यात्रा कार्यक्रम',
    addActivity: 'गतिविधि जोड़ें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    deleteActivity: 'गतिविधि हटाएं',
    deleteActivityMsg: 'क्या आप वाकई इस गतिविधि को हटाना चाहते हैं?',
    delete: 'हटाएं',
    regenerate: 'यात्रा कार्यक्रम पुनः बनाएं',
    validationTitle: 'सत्यापन',
    validationMsg: 'गतिविधि का नाम और समय खाली नहीं हो सकता।',
    newActivity: 'नई गतिविधि',
  },

  // ── Expenses Screen ──────────────────────────────────────────────
  expenses: {
    title: 'खर्च विभाजन',
    totalExpenses: 'कुल यात्रा खर्च',
    youPaid: 'आपने भुगतान किया',
    share: 'हिस्सा',
    balances: 'शेष राशि',
    recentExpenses: 'हाल के खर्चे',
    paidBy: 'भुगतान किया',
    addExpense: 'नया खर्च जोड़ें',
    editExpense: 'खर्च संपादित करें',
    expenseTitle: 'खर्च का शीर्षक',
    expenseTitlePlaceholder: 'जैसे मरीना पर रात का खाना',
    amount: 'राशि',
    paidByLabel: 'भुगतानकर्ता',
    category: 'श्रेणी',
    saveChanges: 'बदलाव सहेजें',
    deleteExpense: 'खर्च हटाएं',
    deleteExpenseMsg: 'क्या आप वाकई इस खर्च को हटाना चाहते हैं?',
    markAsPaid: 'भुगतान किया',
    settled: 'व्यवस्थित',
    allSettled: 'सभी शेष राशि व्यवस्थित हो गई!',
    noExpenses: 'अभी तक कोई खर्च नहीं। शुरू करने के लिए एक जोड़ें!',
    isOwed: 'को मिलना है',
    owes: 'देना है',
    noTrip: 'कोई यात्रा नहीं',
    noTripMsg: 'खर्च जोड़ने के लिए पहले एक यात्रा बनाएं।',
    invalidInput: 'अमान्य इनपुट',
    invalidInputMsg: 'कृपया एक वैध शीर्षक और राशि दर्ज करें।',
    settlement: 'भुगतान से',
  },

  // ── Group Members Screen ─────────────────────────────────────────
  groupMembers: {
    title: 'समूह सदस्य',
    members: 'सदस्य',
    addMember: '+ सदस्य जोड़ें',
    addTripBuddy: 'यात्रा साथी जोड़ें',
    fullName: 'पूरा नाम',
    enterName: 'सदस्य का नाम दर्ज करें',
    emailOptional: 'ईमेल या उपयोगकर्ता नाम (वैकल्पिक)',
    addToTrip: 'यात्रा में जोड़ें',
    liveLocation: 'लाइव स्थान',
    liveTracking: 'लाइव ट्रैकिंग सक्षम',
    member: 'सदस्य',
    errorTitle: 'त्रुटि',
    errorName: 'कृपया नाम दर्ज करें',
    actionDenied: 'कार्रवाई अस्वीकृत',
    cannotRemoveSelf: 'आप खुद को यात्रा से नहीं हटा सकते।',
    removeMember: 'सदस्य हटाएं',
    removeMemberMsg: 'क्या आप वाकई हटाना चाहते हैं',
    fromTrip: 'यात्रा से?',
    cancel: 'रद्द करें',
    remove: 'हटाएं',
  },

  // ── Profile Screen ───────────────────────────────────────────────
  profile: {
    editProfile: 'प्रोफ़ाइल संपादित करें',
    settings: 'सेटिंग्स',
    notifications: 'सूचनाएं',
    darkMode: 'डार्क मोड',
    currency: 'मुद्रा',
    language: 'भाषा',
    privacySettings: 'गोपनीयता सेटिंग्स',
    logout: 'लॉग आउट',
    saveChanges: 'बदलाव सहेजें',
    selectCurrency: 'मुद्रा चुनें',
    selectLanguage: 'भाषा चुनें',
    fullName: 'पूरा नाम',
    emailAddress: 'ईमेल पता',
    enterName: 'अपना नाम दर्ज करें',
    enterEmail: 'अपना ईमेल दर्ज करें',
    changePhoto: 'फ़ोटो बदलें',
    trips: 'यात्राएँ',
    countries: 'देश',
  },

  // ── Auth Screen ──────────────────────────────────────────────────
  auth: {
    welcomeBack: 'अपने अगले साहसिक कार्य के लिए तैयार हैं?',
  },

  // ── Common ───────────────────────────────────────────────────────
  common: {
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    save: 'सहेजें',
    close: 'बंद करें',
    ok: 'ठीक है',
  },
};

export default hi;
