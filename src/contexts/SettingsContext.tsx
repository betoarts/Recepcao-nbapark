import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsContextType {
  logoUrl: string | null;
  webhookUrl: string | null;
  webhookFields: string[];
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({ 
  logoUrl: null, 
  webhookUrl: null,
  webhookFields: [],
  refreshSettings: async () => {}, 
  loading: true 
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookFields, setWebhookFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data && !error) {
        setLogoUrl(data.logo_url);
        setWebhookUrl(data.webhook_url);
        setWebhookFields(data.webhook_fields || []);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ logoUrl, webhookUrl, webhookFields, refreshSettings: fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}
