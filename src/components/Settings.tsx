import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { usePantry } from '../contexts/pantryContext';
import { UserIcon, PaletteIcon, SaveIcon, LanguagesIcon, CrownIcon } from 'lucide-react';
import { SubscriptionPanel } from './SubscriptionPanel';
import { AppHeader } from './AppHeader';
import { userPreferencesApi } from '../api/userPreferences';
import type { UserPreferences } from '../api/types';
import { AppLanguage, persistLanguage } from '../i18n';

interface SettingsProps {
  onBack: () => void;
  onOpenMenu?: () => void;
  checkoutSuccess?: boolean;
  checkoutCancelled?: boolean;
}

const EMPTY_PREFS: UserPreferences = {
  allergies: [],
  dislikes: [],
  likes: [],
  dietaryRestrictions: [],
  householdNotes: '',
  measurementUnit: 'metric',
  notes: '',
};

function listToText(values: string[]): string {
  return values.join(', ');
}

function textToList(value: string): string[] {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

export function Settings({ onBack: _onBack, onOpenMenu, checkoutSuccess = false, checkoutCancelled = false }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { userSettings, updateUserSettings } = usePantry();
  const [activeTab, setActiveTab] = useState(
    checkoutSuccess || checkoutCancelled ? 'subscription' : 'profile',
  );
  const [language, setLanguage] = useState<AppLanguage>(
    i18n.language?.startsWith('zh') ? 'zh' : 'en'
  );
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [preferences, setPreferences] = useState<UserPreferences>(EMPTY_PREFS);
  const [allergyText, setAllergyText] = useState('');
  const [dislikeText, setDislikeText] = useState('');
  const [likeText, setLikeText] = useState('');
  const [restrictionText, setRestrictionText] = useState('');
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPrefs(true);
      try {
        const prefs = await userPreferencesApi.get();
        if (cancelled || !prefs) return;
        setPreferences(prefs);
        setAllergyText(listToText(prefs.allergies));
        setDislikeText(listToText(prefs.dislikes));
        setLikeText(listToText(prefs.likes));
        setRestrictionText(listToText(prefs.dietaryRestrictions));
      } catch {
        if (!cancelled) {
          setErrorMessage(t('settings.loadPrefsError'));
        }
      } finally {
        if (!cancelled) {
          setLoadingPrefs(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const applyLanguage = async (lng: AppLanguage) => {
    setLanguage(lng);
    persistLanguage(lng);
    await i18n.changeLanguage(lng);
    updateUserSettings({
      ...userSettings,
      language: lng,
    });
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      const payload: UserPreferences = {
        ...preferences,
        allergies: textToList(allergyText),
        dislikes: textToList(dislikeText),
        likes: textToList(likeText),
        dietaryRestrictions: textToList(restrictionText),
      };
      const saved = await userPreferencesApi.update(payload);
      if (!saved) {
        setErrorMessage(t('settings.savePrefsError'));
        return;
      }
      setPreferences(saved);
      setAllergyText(listToText(saved.allergies));
      setDislikeText(listToText(saved.dislikes));
      setLikeText(listToText(saved.likes));
      setRestrictionText(listToText(saved.dietaryRestrictions));
      updateUserSettings({
        ...userSettings,
        measurement_unit: saved.measurementUnit,
      });
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } catch {
      setErrorMessage(t('settings.savePrefsError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  const tabClass = (tab: string) =>
    activeTab === tab
      ? 'border-b-2 border-herb text-herb'
      : 'text-muted hover:text-ink';

  return (
    <div className="flex flex-col w-full min-h-screen bg-linen">
      <AppHeader title={t('settings.title')} onOpenMenu={onOpenMenu} />
      <div className="flex-1 overflow-y-auto">
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
          <div className="border-b border-line">
            <div className="flex">
              <button
                className={`px-6 py-4 text-sm font-medium flex items-center ${tabClass('profile')}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserIcon size={18} className="mr-2" />
                {t('settings.profile')}
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium flex items-center ${tabClass('preferences')}`}
                onClick={() => setActiveTab('preferences')}
              >
                {t('settings.preferences')}
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium flex items-center ${tabClass('subscription')}`}
                onClick={() => setActiveTab('subscription')}
              >
                <CrownIcon size={18} className="mr-2" />
                Subscription
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium flex items-center ${tabClass('appearance')}`}
                onClick={() => setActiveTab('appearance')}
              >
                <PaletteIcon size={18} className="mr-2" />
                {t('settings.appearance')}
              </button>
            </div>
          </div>

          <div className="py-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-semibold text-ink mb-4">{t('settings.profileInfo')}</h2>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">{t('settings.name')}</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">{t('settings.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
                </div>
                <button onClick={handleSave} className="btn-primary flex items-center">
                  <SaveIcon size={18} className="mr-2" />
                  {t('common.save')}
                </button>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-semibold text-ink mb-4">{t('settings.foodPreferences')}</h2>
                <p className="text-sm text-muted -mt-2">
                  {t('settings.foodPreferencesHint')}
                </p>

                {loadingPrefs ? (
                  <p className="text-sm text-muted">{t('settings.loadingPrefs')}</p>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">{t('settings.allergies')}</label>
                      <input
                        type="text"
                        value={allergyText}
                        onChange={e => setAllergyText(e.target.value)}
                        placeholder={t('settings.allergiesPlaceholder')}
                        className="input-field"
                      />
                      <p className="text-xs text-muted mt-1">{t('settings.allergiesHint')}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">{t('settings.dislikes')}</label>
                      <input
                        type="text"
                        value={dislikeText}
                        onChange={e => setDislikeText(e.target.value)}
                        placeholder={t('settings.dislikesPlaceholder')}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">{t('settings.likes')}</label>
                      <input
                        type="text"
                        value={likeText}
                        onChange={e => setLikeText(e.target.value)}
                        placeholder={t('settings.likesPlaceholder')}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">{t('settings.dietary')}</label>
                      <input
                        type="text"
                        value={restrictionText}
                        onChange={e => setRestrictionText(e.target.value)}
                        placeholder={t('settings.dietaryPlaceholder')}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">{t('settings.household')}</label>
                      <textarea
                        value={preferences.householdNotes}
                        onChange={e => setPreferences(prev => ({ ...prev, householdNotes: e.target.value }))}
                        placeholder={t('settings.householdPlaceholder')}
                        rows={3}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">{t('settings.otherNotes')}</label>
                      <textarea
                        value={preferences.notes}
                        onChange={e => setPreferences(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t('settings.otherNotesPlaceholder')}
                        rows={2}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-ink mb-3">{t('settings.measurementUnits')}</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="imperial"
                            name="units"
                            type="radio"
                            checked={preferences.measurementUnit === 'imperial'}
                            onChange={() => setPreferences(prev => ({ ...prev, measurementUnit: 'imperial' }))}
                            className="h-4 w-4 text-herb border-line"
                          />
                          <label htmlFor="imperial" className="ml-3 block text-sm font-medium text-ink">
                            {t('settings.imperial')}
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="metric"
                            name="units"
                            type="radio"
                            checked={preferences.measurementUnit === 'metric'}
                            onChange={() => setPreferences(prev => ({ ...prev, measurementUnit: 'metric' }))}
                            className="h-4 w-4 text-herb border-line"
                          />
                          <label htmlFor="metric" className="ml-3 block text-sm font-medium text-ink">
                            {t('settings.metric')}
                          </label>
                        </div>
                      </div>
                    </div>

                    {errorMessage && <p className="text-sm text-herb">{errorMessage}</p>}

                    <button
                      onClick={handleSavePreferences}
                      disabled={saving}
                      className="btn-primary flex items-center disabled:opacity-60"
                    >
                      <SaveIcon size={18} className="mr-2" />
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === 'subscription' && (
              <SubscriptionPanel
                checkoutSuccess={checkoutSuccess}
                checkoutCancelled={checkoutCancelled}
              />
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
                    <LanguagesIcon size={22} />
                    {t('settings.language')}
                  </h2>
                  <p className="text-sm text-muted">{t('settings.languageHint')}</p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        id="lang-en"
                        name="language"
                        type="radio"
                        checked={language === 'en'}
                        onChange={() => applyLanguage('en')}
                        className="h-4 w-4 text-herb border-line"
                      />
                      <label htmlFor="lang-en" className="ml-3 block text-sm font-medium text-ink">
                        {t('settings.langEn')}
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="lang-zh"
                        name="language"
                        type="radio"
                        checked={language === 'zh'}
                        onChange={() => applyLanguage('zh')}
                        className="h-4 w-4 text-herb border-line"
                      />
                      <label htmlFor="lang-zh" className="ml-3 block text-sm font-medium text-ink">
                        {t('settings.langZh')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-line text-center">
            <button onClick={logout} className="btn-secondary px-6 py-3">
              {t('settings.signOut')}
            </button>
          </div>

          {showSaveMessage && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-sage text-herb-deep px-6 py-3 rounded-lg shadow-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t('common.savedSuccess')}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
