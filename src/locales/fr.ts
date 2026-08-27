const fr = {
  // ── Navigation ──────────────────────────────────────────────────
  nav: {
    home: 'Accueil',
    trips: 'Voyages',
    expenses: 'Dépenses',
    profile: 'Profil',
  },

  // ── Home Screen ─────────────────────────────────────────────────
  home: {
    greeting: 'Bonjour,',
    searchPlaceholder: 'Où allez-vous ?',
    upcomingTrip: 'Prochain voyage',
    startJourney: 'Commencez votre voyage',
    popularDestinations: 'Destinations populaires',
    seeAll: 'Tout voir',
    upcoming: 'À venir',
    noTripsTitle: 'Aucun voyage planifié',
    noTripsSub: 'Créez votre premier voyage et explorez le monde !',
    createTrip: 'Créer un voyage',
    createNewTrip: 'Nouveau voyage',
    startingFrom: 'À partir de',
  },

  // ── Create Trip Screen ───────────────────────────────────────────
  createTrip: {
    title: 'Nouveau voyage',
    whereTo: 'Où aller ?',
    enterDestination: 'Entrez la destination',
    startDate: 'Date de départ',
    endDate: 'Date de retour',
    budget: 'Budget',
    groupSize: 'Taille du groupe',
    interests: 'Intérêts',
    continue: 'Continuer',
    done: 'Terminé',
    invalidDate: 'Date invalide',
    invalidDateMsg: 'La date de fin ne peut pas être avant la date de début.',
    enterDestinationAlert: 'Veuillez entrer une destination',
  },

  // ── Trip Details Screen ──────────────────────────────────────────
  tripDetails: {
    travelBuddies: 'Compagnons de voyage',
    total: 'total',
    budgetSummary: 'Résumé du budget',
    totalBudget: 'Budget total',
    remaining: 'Restant',
    itineraryPreview: "Aperçu de l'itinéraire",
    viewFull: 'Voir tout',
    preview: 'Aperçu',
    noItinerary: "Aucun itinéraire généré. Appuyez pour en créer un avec l'IA !",
    generateAI: "Générer un itinéraire IA",
    editAI: "Modifier l'itinéraire IA",
  },

  // ── AI Itinerary Screen ──────────────────────────────────────────
  itinerary: {
    title: 'Votre itinéraire intelligent',
    addActivity: 'Ajouter une activité',
    save: 'Enregistrer',
    cancel: 'Annuler',
    deleteActivity: 'Supprimer l\'activité',
    deleteActivityMsg: 'Voulez-vous vraiment supprimer cette activité ?',
    delete: 'Supprimer',
    regenerate: "Régénérer l'itinéraire",
    validationTitle: 'Validation',
    validationMsg: 'Le nom et l\'heure de l\'activité ne peuvent pas être vides.',
    newActivity: 'Nouvelle activité',
  },

  // ── Expenses Screen ──────────────────────────────────────────────
  expenses: {
    title: 'Partage des dépenses',
    totalExpenses: 'Total des dépenses du voyage',
    youPaid: 'Vous avez payé',
    share: 'Part',
    balances: 'Soldes',
    recentExpenses: 'Dépenses récentes',
    paidBy: 'Payé par',
    addExpense: 'Ajouter une dépense',
    editExpense: 'Modifier la dépense',
    expenseTitle: 'Titre de la dépense',
    expenseTitlePlaceholder: 'ex. Dîner au port',
    amount: 'Montant',
    paidByLabel: 'Payé par',
    category: 'Catégorie',
    saveChanges: 'Enregistrer',
    deleteExpense: 'Supprimer la dépense',
    deleteExpenseMsg: 'Voulez-vous vraiment supprimer cette dépense ?',
    markAsPaid: 'Marquer comme payé',
    settled: 'Réglé',
    allSettled: 'Tous les soldes sont réglés !',
    noExpenses: 'Aucune dépense. Ajoutez-en une pour commencer !',
    isOwed: 'est dû',
    owes: 'doit',
    noTrip: 'Aucun voyage',
    noTripMsg: 'Créez d\'abord un voyage pour ajouter des dépenses.',
    invalidInput: 'Entrée invalide',
    invalidInputMsg: 'Veuillez entrer un titre et un montant valides.',
    settlement: 'Règlement de',
  },

  // ── Group Members Screen ─────────────────────────────────────────
  groupMembers: {
    title: 'Membres du groupe',
    members: 'Membres',
    addMember: '+ Ajouter',
    addTripBuddy: 'Ajouter un compagnon',
    fullName: 'Nom complet',
    enterName: 'Entrez le nom du membre',
    emailOptional: 'E-mail ou pseudo (facultatif)',
    addToTrip: 'Ajouter au voyage',
    liveLocation: 'Position en direct',
    liveTracking: 'Suivi en direct activé',
    member: 'Membre',
    errorTitle: 'Erreur',
    errorName: 'Veuillez entrer un nom',
    actionDenied: 'Action refusée',
    cannotRemoveSelf: 'Vous ne pouvez pas vous retirer du voyage.',
    removeMember: 'Retirer le membre',
    removeMemberMsg: 'Voulez-vous vraiment retirer',
    fromTrip: 'du voyage ?',
    cancel: 'Annuler',
    remove: 'Retirer',
  },

  // ── Profile Screen ───────────────────────────────────────────────
  profile: {
    editProfile: 'Modifier le profil',
    settings: 'Paramètres',
    notifications: 'Notifications',
    darkMode: 'Mode sombre',
    currency: 'Devise',
    language: 'Langue',
    privacySettings: 'Confidentialité',
    logout: 'Se déconnecter',
    saveChanges: 'Enregistrer',
    selectCurrency: 'Choisir la devise',
    selectLanguage: 'Choisir la langue',
    fullName: 'Nom complet',
    emailAddress: 'Adresse e-mail',
    enterName: 'Entrez votre nom',
    enterEmail: 'Entrez votre e-mail',
    changePhoto: 'Changer la photo',
    trips: 'Voyages',
    countries: 'Pays',
  },

  // ── Auth Screen ──────────────────────────────────────────────────
  auth: {
    welcomeBack: 'Prêt pour votre prochaine aventure ?',
  },

  // ── Common ───────────────────────────────────────────────────────
  common: {
    cancel: 'Annuler',
    delete: 'Supprimer',
    save: 'Enregistrer',
    close: 'Fermer',
    ok: 'OK',
  },
};

export default fr;
