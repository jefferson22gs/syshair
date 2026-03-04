import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AIConfig {
  apiKey: string;
  provider: string;
  isActive: boolean;
}

export const useAIConfig = () => {
  const { user } = useAuth();
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAIConfig = useCallback(async () => {
    if (!user) {
      setAiConfig(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get salon for this user
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (salonError) {
        console.error('Error fetching salon:', salonError);
        throw salonError;
      }

      if (!salon) {
        setAiConfig(null);
        setIsLoading(false);
        return;
      }

      // Get active AI configuration for this salon
      const { data: config, error: configError } = await supabase
        .from('salon_ai_configs')
        .select(`
          id,
          provider,
          ai_provider_keys(api_key, provider, is_active)
        `)
        .eq('salon_id', salon.id)
        .eq('is_active', true)
        .eq('ai_provider_keys.is_active', true)
        .single();

      if (configError) {
        console.error('Error fetching AI config:', configError);
        // Não lança erro para não bloquear o funcionamento - apenas não há configuração
        setAiConfig(null);
        return;
      }

      if (config && config.ai_provider_keys) {
        setAiConfig({
          apiKey: config.ai_provider_keys.api_key,
          provider: config.ai_provider_keys.provider,
          isActive: config.ai_provider_keys.is_active
        });
      } else {
        setAiConfig(null);
      }

    } catch (err) {
      console.error('Error loading AI config:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAIConfig();
    } else {
      setAiConfig(null);
    }
  }, [user, loadAIConfig]);

  // Reload AI config when needed
  const refresh = useCallback(() => {
    if (user) {
      loadAIConfig();
    }
  }, [user, loadAIConfig]);

  return {
    aiConfig,
    isLoading,
    error,
    refresh,
  };
};