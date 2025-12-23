import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'trial' | 'active' | 'pending' | 'cancelled' | 'expired' | 'blocked' | 'none';

export interface SubscriptionData {
    id: string;
    status: SubscriptionStatus;
    isActive: boolean;
    isTrial: boolean;
    daysRemaining: number;
    trialEndDate: Date | null;
    currentPeriodEnd: Date | null;
    nextPaymentDate: Date | null;
    amount: number;
    planName: string;
}

interface SubscriptionContextType {
    subscription: SubscriptionData | null;
    isLoading: boolean;
    isBlocked: boolean;
    error: Error | null;
    checkSubscription: () => Promise<void>;
    startTrial: () => Promise<boolean>;
    activateSubscription: (mpPreapprovalId: string) => Promise<boolean>;
}

// Storage key for local persistence
const SUBSCRIPTION_STORAGE_KEY = 'syshair_subscription';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Load subscription from localStorage (mock mode)
    const loadFromStorage = (): SubscriptionData | null => {
        try {
            const stored = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Convert date strings back to Date objects
                return {
                    ...data,
                    trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
                    currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
                    nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : null,
                };
            }
        } catch (e) {
            console.error('Error loading subscription from storage:', e);
        }
        return null;
    };

    // Save subscription to localStorage (mock mode)
    const saveToStorage = (data: SubscriptionData) => {
        try {
            localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving subscription to storage:', e);
        }
    };

    const checkSubscription = async () => {
        if (!user) {
            setSubscription(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Try to load from storage first (mock mode)
            let sub = loadFromStorage();

            if (sub) {
                // Recalculate days remaining based on current date
                const now = new Date();

                if (sub.isTrial && sub.trialEndDate) {
                    const trialEnd = new Date(sub.trialEndDate);
                    sub.isActive = trialEnd > now;
                    sub.daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                    // If trial expired, update status
                    if (!sub.isActive) {
                        sub.status = 'expired';
                    }
                } else if (sub.status === 'active' && sub.currentPeriodEnd) {
                    const periodEnd = new Date(sub.currentPeriodEnd);
                    sub.isActive = periodEnd > now;
                    sub.daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                }

                setSubscription(sub);
                saveToStorage(sub); // Update storage with recalculated values
            } else {
                // No subscription found, auto-start trial for new users
                await startTrial();
            }

            /* 
            // TODO: When Supabase is ready, uncomment this:
            const { data: salon } = await supabase
              .from('salons')
              .select('id')
              .eq('owner_id', user.id)
              .maybeSingle();
      
            if (salon) {
              const { data: sub } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('salon_id', salon.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              // Process subscription data...
            }
            */

        } catch (err) {
            console.error('Error checking subscription:', err);
            setError(err as Error);
            // On error, allow access (graceful degradation)
            setSubscription({
                id: 'fallback',
                status: 'active',
                isActive: true,
                isTrial: false,
                daysRemaining: 30,
                trialEndDate: null,
                currentPeriodEnd: null,
                nextPaymentDate: null,
                amount: 39.90,
                planName: 'SysHair Premium',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const startTrial = async (): Promise<boolean> => {
        try {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);

            const newSubscription: SubscriptionData = {
                id: `trial_${Date.now()}`,
                status: 'trial',
                isActive: true,
                isTrial: true,
                daysRemaining: 7,
                trialEndDate,
                currentPeriodEnd: null,
                nextPaymentDate: null,
                amount: 39.90,
                planName: 'SysHair Premium',
            };

            setSubscription(newSubscription);
            saveToStorage(newSubscription);

            /* 
            // TODO: When Supabase is ready:
            const { data, error } = await supabase
              .from('subscriptions')
              .insert({
                salon_id: salonId,
                user_id: user.id,
                status: 'trial',
                is_trial: true,
                trial_start_date: new Date().toISOString(),
                trial_end_date: trialEndDate.toISOString(),
              })
              .select()
              .single();
            */

            return true;
        } catch (err) {
            console.error('Error starting trial:', err);
            setError(err as Error);
            return false;
        }
    };

    const activateSubscription = async (mpPreapprovalId: string): Promise<boolean> => {
        try {
            const now = new Date();
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            const activatedSubscription: SubscriptionData = {
                id: mpPreapprovalId,
                status: 'active',
                isActive: true,
                isTrial: false,
                daysRemaining: 30,
                trialEndDate: null,
                currentPeriodEnd: periodEnd,
                nextPaymentDate: periodEnd,
                amount: 39.90,
                planName: 'SysHair Premium',
            };

            setSubscription(activatedSubscription);
            saveToStorage(activatedSubscription);

            /* 
            // TODO: When Supabase is ready:
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                is_trial: false,
                mp_preapproval_id: mpPreapprovalId,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
              })
              .eq('id', subscription.id);
            */

            return true;
        } catch (err) {
            console.error('Error activating subscription:', err);
            setError(err as Error);
            return false;
        }
    };

    useEffect(() => {
        checkSubscription();
    }, [user]);

    // Check subscription status periodically (every 5 minutes)
    useEffect(() => {
        const interval = setInterval(checkSubscription, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    const isBlocked = subscription ? !subscription.isActive && subscription.status !== 'none' : false;

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                isLoading,
                isBlocked,
                error,
                checkSubscription,
                startTrial,
                activateSubscription,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
