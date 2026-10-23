export type Environment = 'staging' | 'sandbox' | 'production';

export interface EnvironmentHosts {
  publicApis: string;
  authService: string;
  partnersService: string;
}

export const ENVIRONMENTS: Record<Environment, EnvironmentHosts> = Object.freeze({
  staging: {
    publicApis: 'https://public-apis-master.lmndstaging.com',
    authService: 'https://auth-master.lmndstaging.com',
    partnersService: 'https://partners-master.lmndstaging.com'
  },
  sandbox: {
    publicApis: 'https://public-apis-sandbox.public.lmndsandbox.com',
    authService: 'https://auth-sandbox.lmndsandbox.com',
    partnersService: 'https://partners-sandbox.lmndsandbox.com'
  },
  production: {
    publicApis: 'https://apis.lemonade.com',
    authService: 'https://auth-production.lmndprod.com',
    partnersService: 'https://partners-production.lmndprod.com'
  }
});
