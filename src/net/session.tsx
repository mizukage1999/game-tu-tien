import React, { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase, isOnlineEnabled } from './config';

export interface Account {
  user: User | null;
  booting: boolean;
}

interface AccountContextValue extends Account {
  refresh: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

// Single source of truth for non-React consumers (scenes, net layer).
let accountState: Account = { user: null, booting: true };

interface AccountProviderProps {
  children: React.ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const [account, setAccount] = React.useState<Account>(accountState);

  const refresh = React.useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      accountState = { user: null, booting: false };
      setAccount({ user: null, booting: false });
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      accountState = { user: data.session?.user ?? null, booting: false };
      setAccount({ user: data.session?.user ?? null, booting: false });
      supabase.auth.onAuthStateChange((_event, session) => {
        accountState = {
          user: session?.user ?? null,
          booting: false,
        };
        setAccount({
          user: session?.user ?? null,
          booting: false,
        });
      });
    } catch (err) {
      console.error('[net/session] refresh failed', err);
      accountState = { user: null, booting: false };
      setAccount({ user: null, booting: false });
    }
  }, []);

  React.useEffect(() => {
    if (isOnlineEnabled()) {
      refresh();
    } else {
      accountState = { user: null, booting: false };
      setAccount({ user: null, booting: false });
    }
  }, [refresh]);

  return (
    <AccountContext.Provider value={{ ...account, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): Account {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return { user: ctx.user, booting: ctx.booting };
}

export function getAccountState(): Account {
  return accountState;
}
