/**
 * What is allowed to end a session.
 *
 * The interceptor used to log the user out whenever the refresh call threw,
 * for any reason at all. A timeout on a weak signal, or a 502 while the
 * backend was deploying, and a refresh token still valid for another thirty
 * days was erased from the Keychain — leaving the user at a login screen with
 * no explanation and no credential left to recover with.
 *
 * The rule these tests hold in place: only the server SAYING NO ends a
 * session. Not hearing back is not a no.
 */
import axios, { type AxiosInstance } from 'axios';
import { setupRefreshInterceptor } from './refresh.interceptor';
import { TokenManager } from '../../security/TokenManager';
import { useAuthStore } from '../../store/auth.store';
import { endpoints } from '../endpoints';

jest.mock('../../security/TokenManager', () => ({
  TokenManager: {
    getAccessToken: jest.fn(),
    setAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setRefreshToken: jest.fn(),
    clearAll: jest.fn(),
  },
}));

const tokens = TokenManager as jest.Mocked<typeof TokenManager>;

/** An axios rejection carrying a real HTTP response. */
function httpError(status: number): unknown {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: {} },
  });
}

/** An axios rejection where the request never got an answer. */
function networkError(code: string): unknown {
  return Object.assign(new Error('Network Error'), {
    isAxiosError: true,
    code,
    response: undefined,
  });
}

/**
 * An instance whose adapter answers from a queue, so each test scripts exactly
 * what the network does. The first entry answers the refresh POST.
 */
function instanceThatAnswers(outcomes: readonly unknown[]): AxiosInstance {
  const client = axios.create({ baseURL: 'http://api.test' });
  const queue = [...outcomes];
  client.defaults.adapter = () => Promise.reject(queue.shift() ?? httpError(500));
  setupRefreshInterceptor(client);
  return client;
}

type RejectionHandler = (error: unknown) => Promise<unknown>;

/** The rejection half of the interceptor this file installed. */
function rejectionHandlerOf(client: AxiosInstance): RejectionHandler {
  const registered = (
    client.interceptors.response as unknown as {
      handlers: readonly { rejected: RejectionHandler }[];
    }
  ).handlers[0];
  if (registered === undefined) {
    throw new Error('setupRefreshInterceptor registered no rejection handler');
  }
  return registered.rejected;
}

/** Drives one protected request that the server answers with 401. */
async function requestUnder(client: AxiosInstance): Promise<unknown> {
  const originalRequest = { url: '/v1/users/me', method: 'get', headers: {} };
  const rejection = Object.assign(httpError(401) as object, { config: originalRequest });
  return rejectionHandlerOf(client)(rejection).then(
    (value) => value,
    (error: unknown) => error,
  );
}

describe('a refresh the server refuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isLoggedIn: true, isLoading: false });
    tokens.getRefreshToken.mockResolvedValue('a-refresh-token');
  });

  it.each([401, 403])('ends the session on %s', async (status) => {
    const client = instanceThatAnswers([httpError(status)]);

    await requestUnder(client);

    expect(tokens.clearAll).toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('ends the session when no refresh token is stored', async () => {
    tokens.getRefreshToken.mockResolvedValue(null);
    const client = instanceThatAnswers([]);

    await requestUnder(client);

    expect(tokens.clearAll).toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });
});

describe('a refresh that never got an answer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isLoggedIn: true, isLoading: false });
    tokens.getRefreshToken.mockResolvedValue('a-refresh-token');
  });

  // The regression. Each of these once cost the user their session.
  it.each([
    ['a timeout', networkError('ECONNABORTED')],
    ['no connection', networkError('ERR_NETWORK')],
    ['a 500 from the server', httpError(500)],
    ['a 502 mid-deploy', httpError(502)],
    ['a 429 rate limit', httpError(429)],
  ])('keeps the session through %s', async (_label, outcome) => {
    const client = instanceThatAnswers([outcome]);

    await requestUnder(client);

    // The refresh token is still on the device, so the next attempt can work.
    expect(tokens.clearAll).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('still reports the failure to the caller', async () => {
    // Surviving the error must not mean swallowing it — the screen that made
    // the request has to be able to say the request did not succeed.
    const client = instanceThatAnswers([networkError('ERR_NETWORK')]);

    const result = await requestUnder(client);

    expect(result).toBeInstanceOf(Error);
  });
});

describe('the refresh endpoint itself', () => {
  it('is never retried through the interceptor', async () => {
    // Guards against the loop: a 401 on the refresh call triggering another
    // refresh call, forever.
    jest.clearAllMocks();
    const client = instanceThatAnswers([]);
    const rejection = Object.assign(httpError(401) as object, {
      config: { url: endpoints.auth.refresh, method: 'post', headers: {} },
    });

    await expect(rejectionHandlerOf(client)(rejection)).rejects.toBeDefined();
    expect(tokens.getRefreshToken).not.toHaveBeenCalled();
  });
});
