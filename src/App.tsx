import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { I18nProvider } from './context/I18nContext';
import { TripProvider, useTrips } from './context/TripContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ItineraryProvider } from './context/ItineraryContext';
import { MemberProvider } from './context/MemberContext';
import { ChatProvider } from './context/ChatContext';

// Navigation Components
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';

// Screens
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { PhoneLoginScreen } from './screens/PhoneLoginScreen';
import { OTPScreen } from './screens/OTPScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TripsScreen } from './screens/TripsScreen';
import { CreateTripScreen } from './screens/CreateTripScreen';
import { TripDetailsScreen } from './screens/TripDetailsScreen';
import { AIItineraryScreen } from './screens/AIItineraryScreen';
import { TripChatScreen } from './screens/TripChatScreen';
import { TripExpensesScreen } from './screens/TripExpensesScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { LiveMapScreen } from './screens/LiveMapScreen';
import { GroupMembersScreen } from './screens/GroupMembersScreen';
import { ProfileScreen } from './screens/ProfileScreen';

type Screen =
  | 'splash'
  | 'onboarding'
  | 'auth'
  | 'phone_login'
  | 'otp'
  | 'home'
  | 'trips'
  | 'create_trip'
  | 'trip_details'
  | 'ai_itinerary'
  | 'group_members'
  | 'trip_chat'
  | 'trip_expenses'
  | 'live_tracking'
  | 'expenses'
  | 'profile';

const AppContent = () => {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  const { trips } = useTrips();

  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [phoneForOTP, setPhoneForOTP] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [initialJoinCode, setInitialJoinCode] = useState<string | null>(null);
  const [autoOpenJoin, setAutoOpenJoin] = useState(false);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || (trips.length > 0 ? trips[0] : undefined);

  // Check URL params for direct join codes on initial load (e.g. ?join=SANTO1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const joinParam = urlParams.get('join') || urlParams.get('code');
      if (joinParam) {
        setInitialJoinCode(joinParam.toUpperCase());
        setAutoOpenJoin(true);
      }
    }
  }, []);

  // Splash Finished
  const handleSplashFinish = () => {
    if (user) {
      if (autoOpenJoin || initialJoinCode) {
        setCurrentScreen('trips');
      } else {
        setCurrentScreen('home');
      }
    } else {
      const hasSeenOnboarding = typeof window !== 'undefined' ? localStorage.getItem('@seen_onboarding') : null;
      setCurrentScreen(hasSeenOnboarding ? 'auth' : 'onboarding');
    }
  };

  // Onboarding Finished
  const handleOnboardingComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('@seen_onboarding', 'true');
    }
    setCurrentScreen('auth');
  };

  // If user logs in while in auth flow, transition to home or trips (if join code pending)
  React.useEffect(() => {
    if (user && (currentScreen === 'auth' || currentScreen === 'phone_login' || currentScreen === 'otp')) {
      if (autoOpenJoin || initialJoinCode) {
        setCurrentScreen('trips');
      } else {
        setCurrentScreen('home');
      }
    }
  }, [user, currentScreen, autoOpenJoin, initialJoinCode]);

  // If user logs out, transition immediately back to auth screen
  React.useEffect(() => {
    if (!user && currentScreen !== 'splash' && currentScreen !== 'onboarding' && currentScreen !== 'auth' && currentScreen !== 'phone_login' && currentScreen !== 'otp') {
      setCurrentScreen('auth');
    }
  }, [user, currentScreen]);

  // View Trip Hub
  const handleViewTrip = (id: string) => {
    setSelectedTripId(id);
    setCurrentScreen('trip_details');
  };

  const handleOpenJoinFlow = (code?: string) => {
    if (code) setInitialJoinCode(code);
    setAutoOpenJoin(true);
    setCurrentScreen('trips');
  };

  const showNavigation =
    user &&
    currentScreen !== 'splash' &&
    currentScreen !== 'onboarding' &&
    currentScreen !== 'auth' &&
    currentScreen !== 'phone_login' &&
    currentScreen !== 'otp';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navbar */}
      {showNavigation && (
        <Navbar
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            if (screen === 'trips') {
              setAutoOpenJoin(false);
            }
            setCurrentScreen(screen as Screen);
          }}
          onCreateTrip={() => setCurrentScreen('create_trip')}
        />
      )}

      {/* Main Screen Content */}
      <main style={{ flex: 1 }}>
        {currentScreen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}

        {currentScreen === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}

        {currentScreen === 'auth' && (
          <AuthScreen onPhoneLogin={() => setCurrentScreen('phone_login')} />
        )}

        {currentScreen === 'phone_login' && (
          <PhoneLoginScreen
            onBack={() => setCurrentScreen('auth')}
            onSendOTP={(phone) => {
              setPhoneForOTP(phone);
              setCurrentScreen('otp');
            }}
          />
        )}

        {currentScreen === 'otp' && (
          <OTPScreen
            phoneNumber={phoneForOTP}
            onBack={() => setCurrentScreen('phone_login')}
            onSuccess={() => {
              if (autoOpenJoin || initialJoinCode) {
                setCurrentScreen('trips');
              } else {
                setCurrentScreen('home');
              }
            }}
          />
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            onCreateTrip={() => setCurrentScreen('create_trip')}
            onViewTrip={handleViewTrip}
            onJoinTrip={() => handleOpenJoinFlow()}
            onNavigateToTab={(tab) => setCurrentScreen(tab as Screen)}
          />
        )}

        {currentScreen === 'trips' && (
          <TripsScreen
            onViewTrip={handleViewTrip}
            onCreateTrip={() => setCurrentScreen('create_trip')}
            initialJoinCode={initialJoinCode || undefined}
            autoOpenJoin={autoOpenJoin}
          />
        )}

        {currentScreen === 'create_trip' && (
          <CreateTripScreen
            onBack={() => setCurrentScreen('home')}
            onContinue={(newTrip) => {
              setSelectedTripId(newTrip.id);
              setCurrentScreen('trip_details');
            }}
          />
        )}

        {currentScreen === 'trip_details' && (
          <TripDetailsScreen
            tripData={selectedTrip}
            onBack={() => setCurrentScreen('trips')}
            onGenerateAI={() => setCurrentScreen('ai_itinerary')}
            onViewMembers={() => setCurrentScreen('group_members')}
            onViewExpenses={() => setCurrentScreen('trip_expenses')}
            onOpenChat={() => setCurrentScreen('trip_chat')}
            onOpenLiveTracking={() => setCurrentScreen('live_tracking')}
          />
        )}

        {currentScreen === 'ai_itinerary' && (
          <AIItineraryScreen
            tripData={selectedTrip}
            onBack={() => setCurrentScreen('trip_details')}
          />
        )}

        {currentScreen === 'trip_chat' && selectedTrip && (
          <TripChatScreen
            tripData={selectedTrip}
            onBack={() => setCurrentScreen('trip_details')}
          />
        )}

        {currentScreen === 'trip_expenses' && selectedTrip && (
          <TripExpensesScreen
            tripData={selectedTrip}
            onBack={() => setCurrentScreen('trip_details')}
          />
        )}

        {currentScreen === 'expenses' && <ExpensesScreen />}

        {currentScreen === 'group_members' && selectedTrip && (
          <GroupMembersScreen
            tripData={selectedTrip}
            onBack={() => setCurrentScreen('trip_details')}
          />
        )}

        {currentScreen === 'live_tracking' && selectedTrip && (
          <LiveMapScreen
            tripData={selectedTrip}
            onBack={() => setCurrentScreen('trip_details')}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen onLogout={() => setCurrentScreen('auth')} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {showNavigation && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            if (screen === 'trips') {
              setAutoOpenJoin(false);
            }
            setCurrentScreen(screen as Screen);
          }}
          onCreateTrip={() => setCurrentScreen('create_trip')}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <I18nProvider>
            <TripProvider>
              <ExpenseProvider>
                <ItineraryProvider>
                  <MemberProvider>
                    <ChatProvider>
                      <AppContent />
                    </ChatProvider>
                  </MemberProvider>
                </ItineraryProvider>
              </ExpenseProvider>
            </TripProvider>
          </I18nProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
