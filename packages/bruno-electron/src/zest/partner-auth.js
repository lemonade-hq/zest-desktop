/**
 * Zest: the Lemonade Partner auth mode, minus Electron. Mints the bearer for a request and maps
 * zest-core errors to the messages the user sees. Never logs or returns anything but the header value.
 */
const { UpstreamError, ENVIRONMENTS } = require('@lemonade-hq/zest-core');

const isEnvironment = (env) => Object.prototype.hasOwnProperty.call(ENVIRONMENTS, env);

/** UpstreamError(status null) means the service did not answer: almost always "not on the VPN". */
const toUserError = (err, env) => {
  if (err instanceof UpstreamError && err.status === null) {
    return new Error(`Cannot reach ${err.service} for ${err.env || env} — are you on the VPN?`);
  }
  return err instanceof Error ? err : new Error(String(err));
};

/** Run a zest-core call and rethrow any failure with its user-facing message. */
const mapZestError = async (env, fn) => {
  try {
    return await fn();
  } catch (err) {
    throw toUserError(err, env);
  }
};

/**
 * @param {{ partnerToken(env: string, id: string): Promise<{ accessToken: string }> }} zestAuth
 * @param {{ env: string, partnerPublicId: string }} config already interpolated
 * @returns {Promise<string>} the Authorization header value
 */
const mintPartnerBearer = async (zestAuth, config) => {
  const env = String(config?.env ?? '').trim();
  const partnerPublicId = String(config?.partnerPublicId ?? '').trim();
  if (!isEnvironment(env)) {
    throw new Error(`Lemonade Partner auth: env must be staging, sandbox or production (got "${env}")`);
  }
  if (!partnerPublicId) {
    throw new Error('Lemonade Partner auth: no partner selected');
  }
  const token = await mapZestError(env, () => zestAuth.partnerToken(env, partnerPublicId));
  return `Bearer ${token.accessToken}`;
};

const listPartners = async (zestAuth, env) => {
  if (!isEnvironment(env)) {
    throw new Error(`Lemonade Partner auth: env must be staging, sandbox or production (got "${env}")`);
  }
  const partners = await mapZestError(env, () => zestAuth.listPartners(env));
  return partners.map(({ name, code, publicId }) => ({ name, code, publicId }));
};

module.exports = { mintPartnerBearer, listPartners, mapZestError, toUserError, isEnvironment };
