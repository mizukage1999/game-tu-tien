export interface AlphaRewards {
  targetLevel: number;
  targetRealm: number;
  jade: number;
  linhThach: number;
  linhKhi: number;
}
export const ALPHATEST_REWARDS: AlphaRewards = {
  targetLevel: 99,
  targetRealm: 9,
  jade: 99999,
  linhThach: 99999,
  linhKhi: 999999,
};
export interface GameMail {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  claimed_at: string | null;
  rewards: Partial<AlphaRewards> & { items?: Record<string, number> };
}
export interface AlphaCampaign {
  id: string;
  enabled: boolean;
  version: number;
  title: string;
  body: string;
  rewards: AlphaRewards;
  delivered: number;
  claimed: number;
}
