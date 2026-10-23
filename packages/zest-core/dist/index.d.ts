type Environment = 'staging' | 'sandbox' | 'production';
interface EnvironmentHosts {
    publicApis: string;
    authService: string;
    partnersService: string;
}
declare const ENVIRONMENTS: Record<Environment, EnvironmentHosts>;

export { ENVIRONMENTS, Environment, EnvironmentHosts };
