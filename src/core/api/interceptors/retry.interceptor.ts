/**
 * Retry Interceptor
 *
 * Retries failed requests on 5xx server errors with exponential backoff.
 * 3 attempts max. Does NOT retry on 4xx (client errors are not transient).
 */
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // 1s, 3s, 5s

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function setupRetryInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as AxiosRequestConfig & {
        _retryCount?: number;
      };

      const status = error.response?.status;

      // Only retry on 5xx server errors or network errors
      const isServerError = status !== undefined && status >= 500;
      const isNetworkError = !error.response && error.code !== 'ECONNABORTED';

      if (!isServerError && !isNetworkError) {
        return Promise.reject(error);
      }

      const retryCount = config._retryCount ?? 0;

      if (retryCount >= MAX_RETRIES) {
        return Promise.reject(error);
      }

      config._retryCount = retryCount + 1;

      const delay = RETRY_DELAYS[retryCount] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]!;
      await sleep(delay);

      return axiosInstance(config);
    },
  );
}
