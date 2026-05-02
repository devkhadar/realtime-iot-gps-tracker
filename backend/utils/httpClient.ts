import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import FormData from "form-data";
import logger from "./logger";

const httpClient: AxiosInstance = axios.create({
  baseURL: process.env.EXTERNAL_FLEET_API_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

const login = async (): Promise<string> => {
  const form = new FormData();
  form.append("username", process.env.EXTERNAL_FLEET_API_USERNAME);
  form.append("password", process.env.EXTERNAL_FLEET_API_PASSWORD);
  form.append("grant_type", "password");

  try {
    const response = await axios.post(`${process.env.EXTERNAL_FLEET_API_URL}/login`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Basic ${process.env.EXTERNAL_FLEET_API_KEY}`,
      },
    });
    return response.data.access_token;
  } catch (error) {
    throw new Error("Login failed");
  }
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    logger.debug("HTTP Interceptor triggered");
    
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest._retry
    ) {
      logger.info(`Token expired or unauthorized. Refreshing: ${isRefreshing}`);
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `bearer ${token}`;
            return httpClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      logger.info("Attempting to refresh token...");
      
      return new Promise((resolve, reject) => {
        login()
          .then((token) => {
            httpClient.defaults.headers["Authorization"] = `bearer ${token}`;
            originalRequest.headers["Authorization"] = `bearer ${token}`;
            processQueue(null, token);
            resolve(httpClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            logger.error("Token refresh failed:", err);
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default httpClient;
