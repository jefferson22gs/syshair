import { useAIConfig } from '@/hooks/useAIConfig';

interface AIProvider {
  provider: string;
  apiKey: string;
}

export const useAIProviders = (): {
  getAIProvider: () => AIProvider | null;
  getAIClient: (provider?: string) => any | null;
} => {
  const { aiConfig } = useAIConfig();

  const getAIProvider = (): AIProvider | null => {
    if (!aiConfig || !aiConfig.isActive) {
      return null;
    }
    return {
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
    };
  };

  const getAIClient = (provider?: string): any => {
    const config = getAIProvider();
    if (!config) return null;

    const selectedProvider = provider || config.provider;
    const apiKey = config.apiKey;

    try {
      switch (selectedProvider) {
        case 'openai':
          // Importar e instanciar OpenAI
          const { OpenAI } = require('openai');
          return new OpenAI({ apiKey });

        case 'gemini':
          // Importar e instanciar Google Gemini
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          return new GoogleGenerativeAI(apiKey);

        case 'anthropic':
          // Importar e instanciar Anthropic Claude
          const { Anthropic } = require('@anthropic-ai/sdk');
          return new Anthropic({ apiKey });

        case 'groq':
          // Importar e instanciar Groq
          const { Groq } = require('groq-sdk');
          return new Groq({ apiKey });

        case 'openrouter':
          // Importar e instanciar OpenRouter
          const { OpenRouter } = require('openrouter');
          return new OpenRouter({ apiKey });

        default:
          console.warn(`Provider ${selectedProvider} not configured`);
          return null;
      }
    } catch (error) {
      console.error('Error initializing AI provider:', error);
      return null;
    }
  };

  return {
    getAIProvider,
    getAIClient,
  };
};