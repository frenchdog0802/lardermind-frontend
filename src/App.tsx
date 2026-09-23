import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Calendar } from './components/Calendar';
import { PantryInventory } from './components/PantryInventory';
import { ShoppingList } from './components/ShoppingList';
import { RecipeManager } from './components/RecipeManager';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { Settings } from './components/Settings';
import { Loading } from './components/Loading';
import { PantryProvider } from './contexts/pantryContext';
import { AuthProvider, useAuth } from './contexts/authContext';
import { AICookingAssistant } from './components/AICookingAssistant';
import { AppDrawer, type AppDrawerView } from './components/AppDrawer';
import { SubscriptionView } from './components/SubscriptionView';
import { MarketingLanding } from './components/MarketingLanding';
import { SetupGuide } from './components/SetupGuide';
import { useMediaQuery } from './hooks/useMediaQuery';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const GUEST_VIEWS = new Set(['landing', 'login', 'signup']);
const KEEP_ALIVE_VIEWS = [
  'aiAssistant',
  'calendar',
  'recipeManager',
  'pantryInventory',
  'shoppingList',
  'settings',
  'subscription',
] as const;

function AppContent() {
  const [currentView, setCurrentView] = useState('aiAssistant');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [pendingAiPrompt, setPendingAiPrompt] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [requestNewChat, setRequestNewChat] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => new Set(['aiAssistant']));
  const [subscriptionNotice, setSubscriptionNotice] = useState<
    'success' | 'cancelled' | 'portal_return' | null
  >(null);
  const isDesktopRail = useMediaQuery('(min-width: 768px)');
  const {
    isAuthenticated,
    initializing,
    redirectError,
  } = useAuth();

  useEffect(() => {
    if (initializing) return;

    const params = new URLSearchParams(window.location.search);
    const subscriptionParam = params.get('subscription');
    if (
      subscriptionParam === 'success' ||
      subscriptionParam === 'cancelled' ||
      subscriptionParam === 'portal_return'
    ) {
      setSubscriptionNotice(subscriptionParam);
      if (isAuthenticated) {
        setCurrentView('subscription');
      }
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (redirectError) {
      setCurrentView('login');
      return;
    }

    if (!isAuthenticated) {
      setCurrentView((prev) => (GUEST_VIEWS.has(prev) ? prev : 'landing'));
      return;
    }

    setCurrentView((prev) =>
      prev === 'landing' || prev === 'login' || prev === 'signup' || prev === 'home'
        ? 'aiAssistant'
        : prev,
    );
  }, [isAuthenticated, initializing, redirectError]);

  useEffect(() => {
    if (!isAuthenticated || GUEST_VIEWS.has(currentView)) return;
    setVisitedViews((prev) => {
      if (prev.has(currentView)) return prev;
      const next = new Set(prev);
      next.add(currentView);
      return next;
    });
  }, [currentView, isAuthenticated]);

  useEffect(() => {
    if (isDesktopRail || !drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, isDesktopRail]);

  const navigateToSignUp = () => setCurrentView('signup');
  const navigateToLogin = () => setCurrentView('login');
  const navigateToCalendar = () => setCurrentView('calendar');
  const navigateToPantryInventory = () => setCurrentView('pantryInventory');
  const navigateToShoppingList = () => setCurrentView('shoppingList');
  const navigateToAiAssistant = (prompt?: string) => {
    if (typeof prompt === 'string' && prompt.trim()) {
      setPendingAiPrompt(prompt);
    }
    setCurrentView('aiAssistant');
  };

  const openMenu = () => setDrawerOpen(true);
  const closeMenu = () => setDrawerOpen(false);
  const menuOpener = isDesktopRail ? undefined : openMenu;

  const handleDrawerNavigate = (view: AppDrawerView) => {
    setCurrentView(view);
  };

  const handleSelectSession = (sessionId: string) => {
    setPendingSessionId(sessionId);
    setRequestNewChat(false);
    setCurrentView('aiAssistant');
  };

  const handleNewChat = () => {
    setRequestNewChat(true);
    setPendingSessionId(null);
    setCurrentView('aiAssistant');
  };

  if (initializing) {
    return <Loading fullScreen />;
  }
  const isGuestView = GUEST_VIEWS.has(currentView);

  const showKeepAlive = (view: (typeof KEEP_ALIVE_VIEWS)[number]) =>
    isAuthenticated && visitedViews.has(view);

  return (
    <div
      className={`w-full min-h-screen bg-linen ${
        !isGuestView && isDesktopRail ? 'flex' : ''
      }`}
    >
      {!isGuestView && (
        <AppDrawer
          variant={isDesktopRail ? 'rail' : 'overlay'}
          open={isDesktopRail || drawerOpen}
          activeView={currentView}
          onClose={closeMenu}
          onNavigate={handleDrawerNavigate}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
        />
      )}

      <div className="flex-1 min-w-0">
      {currentView === 'landing' && (
        <MarketingLanding onGetStarted={navigateToSignUp} onLogin={navigateToLogin} />
      )}
      {currentView === 'login' && (
        <Login
          onLoginSuccess={navigateToAiAssistant}
          onSignUp={navigateToSignUp}
        />
      )}
      {showKeepAlive('aiAssistant') && (
        <div
          className={currentView === 'aiAssistant' ? undefined : 'hidden'}
          aria-hidden={currentView !== 'aiAssistant'}
        >
          <AICookingAssistant
            isActive={currentView === 'aiAssistant'}
            pendingPrompt={pendingAiPrompt}
            onPendingPromptConsumed={() => setPendingAiPrompt(null)}
            requestedSessionId={pendingSessionId}
            requestNewChat={requestNewChat}
            onSessionRequestConsumed={() => {
              setPendingSessionId(null);
              setRequestNewChat(false);
            }}
            onOpenMenu={menuOpener}
            onViewRecipe={(recipeId) => {
              setSelectedRecipeId(recipeId);
              setCurrentView('recipeManager');
            }}
            onViewShoppingList={navigateToShoppingList}
            onViewCalendar={navigateToCalendar}
            onViewPantry={navigateToPantryInventory}
          />
        </div>
      )}
      {showKeepAlive('calendar') && (
        <div className={currentView === 'calendar' ? undefined : 'hidden'} aria-hidden={currentView !== 'calendar'}>
          <Calendar
            onBack={navigateToAiAssistant}
            onOpenMenu={menuOpener}
          />
        </div>
      )}
      {showKeepAlive('recipeManager') && (
        <div
          className={currentView === 'recipeManager' ? undefined : 'hidden'}
          aria-hidden={currentView !== 'recipeManager'}
        >
          <RecipeManager
            onBack={navigateToAiAssistant}
            onOpenMenu={menuOpener}
            selectedRecipeId={selectedRecipeId}
            onSelectedRecipeHandled={() => setSelectedRecipeId(null)}
          />
        </div>
      )}
      {showKeepAlive('settings') && (
        <div className={currentView === 'settings' ? undefined : 'hidden'} aria-hidden={currentView !== 'settings'}>
          <Settings
            onBack={navigateToAiAssistant}
            onOpenMenu={menuOpener}
          />
        </div>
      )}
      {showKeepAlive('subscription') && (
        <div
          className={currentView === 'subscription' ? undefined : 'hidden'}
          aria-hidden={currentView !== 'subscription'}
        >
          <SubscriptionView
            onOpenMenu={menuOpener}
            checkoutSuccess={subscriptionNotice === 'success'}
            checkoutCancelled={subscriptionNotice === 'cancelled'}
            portalReturn={subscriptionNotice === 'portal_return'}
          />
        </div>
      )}
      {showKeepAlive('pantryInventory') && (
        <div
          className={currentView === 'pantryInventory' ? undefined : 'hidden'}
          aria-hidden={currentView !== 'pantryInventory'}
        >
          <PantryInventory
            onBack={navigateToAiAssistant}
            onOpenMenu={menuOpener}
          />
        </div>
      )}
      {showKeepAlive('shoppingList') && (
        <div
          className={currentView === 'shoppingList' ? undefined : 'hidden'}
          aria-hidden={currentView !== 'shoppingList'}
        >
          <ShoppingList
            onBack={navigateToAiAssistant}
            onOpenMenu={menuOpener}
          />
        </div>
      )}
      {currentView === 'signup' && (
        <SignUp onSignUpSuccess={navigateToAiAssistant} onLogin={navigateToLogin} />
      )}
      </div>

      {!isGuestView && isDesktopRail && (
        <SetupGuide
          onNavigate={handleDrawerNavigate}
          onAskAi={(prompt) => {
            setPendingAiPrompt(prompt);
            setRequestNewChat(false);
            setCurrentView('aiAssistant');
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <PantryProvider>
          <AppContent />
        </PantryProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
