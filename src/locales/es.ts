const es = {
  // ── Navigation ──────────────────────────────────────────────────
  nav: {
    home: 'Inicio',
    trips: 'Viajes',
    expenses: 'Gastos',
    profile: 'Perfil',
  },

  // ── Home Screen ─────────────────────────────────────────────────
  home: {
    greeting: 'Buenos días,',
    searchPlaceholder: '¿A dónde vas?',
    upcomingTrip: 'Próximo viaje',
    startJourney: 'Comienza tu viaje',
    popularDestinations: 'Destinos populares',
    seeAll: 'Ver todo',
    upcoming: 'Próximo',
    noTripsTitle: 'No hay viajes planificados',
    noTripsSub: '¡Crea tu primer viaje y empieza a explorar el mundo!',
    createTrip: 'Crear un viaje',
    createNewTrip: 'Nuevo viaje',
    startingFrom: 'Desde',
  },

  // ── Create Trip Screen ───────────────────────────────────────────
  createTrip: {
    title: 'Crear nuevo viaje',
    whereTo: '¿A dónde?',
    enterDestination: 'Ingresa el destino',
    startDate: 'Fecha de inicio',
    endDate: 'Fecha de fin',
    budget: 'Presupuesto',
    groupSize: 'Tamaño del grupo',
    interests: 'Intereses',
    continue: 'Continuar',
    done: 'Listo',
    invalidDate: 'Fecha inválida',
    invalidDateMsg: 'La fecha de fin no puede ser anterior a la de inicio.',
    enterDestinationAlert: 'Por favor ingresa un destino',
  },

  // ── Trip Details Screen ──────────────────────────────────────────
  tripDetails: {
    travelBuddies: 'Compañeros de viaje',
    total: 'total',
    budgetSummary: 'Resumen del presupuesto',
    totalBudget: 'Presupuesto total',
    remaining: 'Restante',
    itineraryPreview: 'Vista previa del itinerario',
    viewFull: 'Ver completo',
    preview: 'Vista previa',
    noItinerary: '¡Sin itinerario generado. Toca para crear uno con IA!',
    generateAI: 'Generar itinerario con IA',
    editAI: 'Editar itinerario con IA',
  },

  // ── AI Itinerary Screen ──────────────────────────────────────────
  itinerary: {
    title: 'Tu itinerario inteligente',
    addActivity: 'Agregar actividad',
    save: 'Guardar',
    cancel: 'Cancelar',
    deleteActivity: 'Eliminar actividad',
    deleteActivityMsg: '¿Seguro que quieres eliminar esta actividad?',
    delete: 'Eliminar',
    regenerate: 'Regenerar itinerario',
    validationTitle: 'Validación',
    validationMsg: 'El nombre y la hora de la actividad no pueden estar vacíos.',
    newActivity: 'Nueva actividad',
  },

  // ── Expenses Screen ──────────────────────────────────────────────
  expenses: {
    title: 'División de gastos',
    totalExpenses: 'Total de gastos del viaje',
    youPaid: 'Pagaste',
    share: 'Parte',
    balances: 'Saldos',
    recentExpenses: 'Gastos recientes',
    paidBy: 'Pagado por',
    addExpense: 'Agregar gasto',
    editExpense: 'Editar gasto',
    expenseTitle: 'Título del gasto',
    expenseTitlePlaceholder: 'ej. Cena en el puerto',
    amount: 'Monto',
    paidByLabel: 'Pagado por',
    category: 'Categoría',
    saveChanges: 'Guardar cambios',
    deleteExpense: 'Eliminar gasto',
    deleteExpenseMsg: '¿Seguro que quieres eliminar este gasto?',
    markAsPaid: 'Marcar como pagado',
    settled: 'Liquidado',
    allSettled: '¡Todos los saldos están liquidados!',
    noExpenses: 'Sin gastos aún. ¡Agrega uno para comenzar!',
    isOwed: 'le deben',
    owes: 'debe',
    noTrip: 'Sin viaje',
    noTripMsg: 'Crea primero un viaje para agregar gastos.',
    invalidInput: 'Entrada inválida',
    invalidInputMsg: 'Por favor ingresa un título y monto válidos.',
    settlement: 'Liquidación de',
  },

  // ── Group Members Screen ─────────────────────────────────────────
  groupMembers: {
    title: 'Miembros del grupo',
    members: 'Miembros',
    addMember: '+ Agregar',
    addTripBuddy: 'Agregar compañero',
    fullName: 'Nombre completo',
    enterName: 'Ingresa el nombre del miembro',
    emailOptional: 'Email o usuario (opcional)',
    addToTrip: 'Agregar al viaje',
    liveLocation: 'Ubicación en vivo',
    liveTracking: 'Seguimiento en vivo activado',
    member: 'Miembro',
    errorTitle: 'Error',
    errorName: 'Por favor ingresa un nombre',
    actionDenied: 'Acción denegada',
    cannotRemoveSelf: 'No puedes eliminarte del viaje.',
    removeMember: 'Eliminar miembro',
    removeMemberMsg: '¿Seguro que quieres eliminar a',
    fromTrip: 'del viaje?',
    cancel: 'Cancelar',
    remove: 'Eliminar',
  },

  // ── Profile Screen ───────────────────────────────────────────────
  profile: {
    editProfile: 'Editar perfil',
    settings: 'Configuración',
    notifications: 'Notificaciones',
    darkMode: 'Modo oscuro',
    currency: 'Moneda',
    language: 'Idioma',
    privacySettings: 'Privacidad',
    logout: 'Cerrar sesión',
    saveChanges: 'Guardar cambios',
    selectCurrency: 'Seleccionar moneda',
    selectLanguage: 'Seleccionar idioma',
    fullName: 'Nombre completo',
    emailAddress: 'Correo electrónico',
    enterName: 'Ingresa tu nombre',
    enterEmail: 'Ingresa tu correo',
    changePhoto: 'Cambiar foto',
    trips: 'Viajes',
    countries: 'Países',
  },

  // ── Auth Screen ──────────────────────────────────────────────────
  auth: {
    welcomeBack: '¿Listo para tu próxima aventura?',
  },

  // ── Common ───────────────────────────────────────────────────────
  common: {
    cancel: 'Cancelar',
    delete: 'Eliminar',
    save: 'Guardar',
    close: 'Cerrar',
    ok: 'Aceptar',
  },
};

export default es;
