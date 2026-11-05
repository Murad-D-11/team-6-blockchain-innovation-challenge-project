import raw from "../config/testnet.json";

export interface TestnetConfig {
  network: string;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  contractId: string;
  tokenContractId: string;
  asset: { code: string; issuer: string };
  periodSecs: number;
  maxPausePeriods: number;
  accounts: {
    admin: string;
    issuer: string;
    worker: string;
    family: string;
    funder: string;
    creditor: string;
    clinic: string;
    employer: string;
  };
  explorerTxUrl: string;
  deployedAt: string;
}

export const config: TestnetConfig = raw as TestnetConfig;
export default config;
