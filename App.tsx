import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';
import { I18nProvider } from './src/context/I18nContext';
import { TripProvider, useTrips } from './src/context/TripContext';
import { ExpenseProvider } from './src/context/ExpenseContext';
import { ItineraryProvider } from './src/context/ItineraryContext';
import { MemberProvider } from './src/context/MemberContext';
import { ChatProvider } from './src/context/ChatContext';

// Navigation Components
import { Navbar } from './src/components/Navbar';
import { BottomNav } from './src/components/BottomNav';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { PhoneLoginScreen } from './src/screens/PhoneLoginScreen';
import { OTPScreen } from './src/screens/OTPScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TripsScreen } from './src/screens/TripsScreen';
import { CreateTripScreen } from './src/screens/CreateTripScreen';
import { TripDetailsScreen } from './src/screens/TripDetailsScreen';
import { AIItineraryScreen } from './src/screens/AIItineraryScreen';
import { TripChatScreen } from './src/screens/TripChatScreen';
import { TripExpensesScreen } from './src/screens/TripExpensesScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { LiveMapScreen } from './src/screens/LiveMapScreen';
import { GroupMembersScreen } from './src/screens/GroupMembersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

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

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || (trips.length > 0 ? trips[0] : undefined);

  // Splash Finished
  const handleSplashFinish = () => {
    if (user) {
      setCurrentScreen('home');
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

  // If user logs in while in auth flow, transition to home
  React.useEffect(() => {
    if (user && (currentScreen === 'auth' || currentScreen === 'phone_login' || currentScreen === 'otp')) {
      setCurrentScreen('home');
    }
  }, [user, currentScreen]);

  // View Trip Hub
  const handleViewTrip = (id: string) => {
    setSelectedTripId(id);
    setCurrentScreen('trip_details');
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
          onNavigate={(screen) => setCurrentScreen(screen as Screen)}
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
            onSuccess={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            onCreateTrip={() => setCurrentScreen('create_trip')}
            onViewTrip={handleViewTrip}
            onNavigateToTab={(tab) => setCurrentScreen(tab as Screen)}
          />
        )}

        {currentScreen === 'trips' && (
          <TripsScreen
            onViewTrip={handleViewTrip}
            onCreateTrip={() => setCurrentScreen('create_trip')}
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

        {currentScreen === 'profile' && <ProfileScreen />}
      </main>

      {/* Mobile Bottom Navigation */}
      {showNavigation && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen as Screen)}
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
