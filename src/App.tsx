import { lazy, Suspense, useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { Loading } from './components/Loading';
import { PantryProvider } from './contexts/pantryContext';
import { AuthProvider, useAuth } from './contexts/authContext';
import { AppDrawer, type AppDrawerView } from './components/AppDrawer';
import { clearSetupGuideLocalStorage } from './utils/setupGuide';
import { useMediaQuery } from './hooks/useMediaQuery';
import { NotFound } from './components/NotFound';
import { ForgotPassword, ResetPassword } from './components/PasswordReset';
import { resolveAppRoute, type AppRoute } from './utils/appRoutes';

// Route-level code splitting. Views are still kept alive by KEEP_ALIVE_VIEWS once visited;
// lazy only defers the first download.
const Calendar = lazy(() => import('./components/Calendar').then((m) => ({ default: m.Calendar })));
const PantryInventory = lazy(() =>
  import('./components/PantryInventory').then((m) => ({ default: m.PantryInventory })),
);
const ShoppingList = lazy(() =>
  import('./components/ShoppingList').then((m) => ({ default: m.ShoppingList })),
);
const RecipeManager = lazy(() =>
  import('./components/RecipeManager').then((m) => ({ default: m.RecipeManager })),
);
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })));
const AICookingAssistant = lazy(() =>
  import('./components/AICookingAssistant').then((m) => ({ default: m.AICookingAssistant })),
);
const SubscriptionView = lazy(() =>
  import('./components/SubscriptionView').then((m) => ({ default: m.SubscriptionView })),
);
const MarketingLanding = lazy(() =>
  import('./components/MarketingLanding').then((m) => ({ default: m.MarketingLanding })),
);

/** Fixed-height fallback (full viewport) so swapping in a view does not shift layout. */
function ViewFallback() {
  return (
    <div className="min-h-screen bg-linen" aria-busy="true">
      <Loading compact />
    </div>
  );
}

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

function readResetTokenFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('token')?.trim() ?? '';
}

function initialViewForRoute(route: AppRoute): string {
  if (route === 'login') return 'login';
  if (route === 'signup') return 'signup';
  return 'aiAssistant';
}

function AppContent() {
  const [route, setRoute] = useState<AppRoute>(() => resolveAppRoute(window.location.pathname));
  const [resetToken] = useState(readResetTokenFromUrl);
  const [currentView, setCurrentView] = useState(() => initialViewForRoute(route));
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [pendingAiPrompt, setPendingAiPrompt] = useState<string | null>(null);
  const [pendingAiAutoSend, setPendingAiAutoSend] = useState(false);
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
    clearSetupGuideLocalStorage();
  }, []);

  // Browser back/forward between the few real paths.
  useEffect(() => {
    const onPopState = () => setRoute(resolveAppRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Do not keep the single-use reset token in the address bar / history.
  useEffect(() => {
    if (route === 'reset-password' && window.location.search.includes('token=')) {
      window.history.replaceState({}, '', '/reset-password');
    }
  }, [route]);

  // /pricing deep link: landing page scrolled to the pricing section.
  useEffect(() => {
    if (route !== 'pricing' || currentView !== 'landing') return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('pricing')?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [route, currentView]);

  const goToRoute = (next: AppRoute, path: string, view?: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(next);
    if (view) setCurrentView(view);
  };
  const goToLogin = () => goToRoute('login', '/login', 'login');
  const goToForgotPassword = () => goToRoute('forgot-password', '/forgot-password');

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
  const navigateToAiAssistant = (prompt?: string, opts?: { autoSend?: boolean }) => {
    if (typeof prompt === 'string' && prompt.trim()) {
      setPendingAiPrompt(prompt);
      setPendingAiAutoSend(opts?.autoSend === true);
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

  if (route === 'not-found') {
    return <NotFound />;
  }
  if (route === 'forgot-password') {
    return <ForgotPassword onBackToLogin={goToLogin} />;
  }
  if (route === 'reset-password') {
    return (
      <ResetPassword
        token={resetToken}
        onBackToLogin={goToLogin}
        onRequestNewLink={goToForgotPassword}
      />
    );
  }

  if (initializing) {
    return <Loading fullScreen />;
  }
  // Logged-out users never get the app shell: before the routing effect runs,
  // currentView can still be 'aiAssistant', which would mount AppDrawer and
  // fire authenticated requests (401s on the landing page).
  const isGuestView = !isAuthenticated || GUEST_VIEWS.has(currentView);

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
      <Suspense fallback={<ViewFallback />}>
      {currentView === 'landing' && (
        <MarketingLanding onGetStarted={navigateToSignUp} onLogin={navigateToLogin} />
      )}
      {currentView === 'login' && (
        <Login
          onLoginSuccess={navigateToAiAssistant}
          onSignUp={navigateToSignUp}
          onForgotPassword={goToForgotPassword}
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
            pendingPromptAutoSend={pendingAiAutoSend}
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
            onViewSubscription={() => setCurrentView('subscription')}
          />
        </div>
      )}
      {showKeepAlive('calendar') && (
        <div className={currentView === 'calendar' ? undefined : 'hidden'} aria-hidden={currentView !== 'calendar'}>
          <Calendar
            onBack={navigateToAiAssistant}
            onOpenMenu={menuOpener}
            onAskAi={navigateToAiAssistant}
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
            onAskAi={navigateToAiAssistant}
            selectedRecipeId={selectedRecipeId}
            onSelectedRecipeHandled={() => setSelectedRecipeId(null)}
          />
        </div>
      )}
      {showKeepAlive('settings') && (
        <div className={currentView === 'settings' ? undefined : 'hidden'} aria-hidden={currentView !== 'settings'}>
          <Settings
            active={currentView === 'settings'}
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
            active={currentView === 'subscription'}
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
            onAskAi={navigateToAiAssistant}
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
            onAskAi={navigateToAiAssistant}
          />
        </div>
      )}
      {currentView === 'signup' && (
        <SignUp onSignUpSuccess={navigateToAiAssistant} onLogin={navigateToLogin} />
      )}
      </Suspense>
      </div>

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
