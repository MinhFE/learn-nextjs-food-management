import envConfig from '@/config';
import { normalizePath } from './utils';
import { redirect } from 'next/navigation';
import { LoginResType } from '@/schemaValidations/auth.schema';

type CustomOptions = Omit<RequestInit, 'method'> & {
  baseUrl?: string;
};

const ENTITY_ERROR_STATUS = 422;
const AUTHENTICATION_ERROR_STATUS = 401;

type EntityErrorPayload = {
  message: string;
  errors: {
    field: string;
    message: string;
  }[];
};

export class HttpError extends Error {
  status: number;
  payload: {
    message: string;
    [key: string]: A;
  };

  constructor({
    status,
    payload,
    message = 'Http error',
  }: {
    status: number;
    payload: A;
    message?: string;
  }) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export class EntityError extends HttpError {
  status: typeof ENTITY_ERROR_STATUS;
  payload: EntityErrorPayload;

  constructor({
    status,
    payload,
  }: {
    status: typeof ENTITY_ERROR_STATUS;
    payload: EntityErrorPayload;
  }) {
    super({ status, payload, message: 'Entity error' });
    this.status = status;
    this.payload = payload;
  }
}

let clientLogoutRequest: null | Promise<A> = null;
const isClient = typeof window !== 'undefined';

const request = async <Response>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  options?: CustomOptions,
) => {
  let body: FormData | string | undefined = undefined;
  if (options?.body instanceof FormData) {
    body = options.body;
  } else if (options?.body) {
    body = JSON.stringify(options.body);
  }

  const baseHeaders: {
    [key: string]: string;
  } =
    body instanceof FormData
      ? {}
      : {
          'Content-Type': 'application/json',
        };

  if (isClient) {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      baseHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  const baseUrl = options?.baseUrl ?? envConfig.NEXT_PUBLIC_API_ENDPOINT;

  const fullUrl = `${baseUrl}/${normalizePath(url)}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      ...baseHeaders,
      ...options?.headers,
    },
    body,
    method,
  });

  const payload: Response = await res.json();
  const data = {
    status: res.status,
    payload,
  };

  //Interceptor
  if (!res.ok) {
    if (res.status === ENTITY_ERROR_STATUS) {
      throw new EntityError(
        data as {
          status: typeof ENTITY_ERROR_STATUS;
          payload: EntityErrorPayload;
        },
      );
    } else if (res.status === AUTHENTICATION_ERROR_STATUS) {
      if (isClient) {
        if (!clientLogoutRequest) {
          clientLogoutRequest = fetch('/api/auth/logout', {
            method: 'POST',
            body: null,
            headers: {
              ...baseHeaders,
            },
          });
          try {
            await clientLogoutRequest;
          } catch (error) {
            console.log(error);
          } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            clientLogoutRequest = null;
            location.href = '/login';
          }
        }
      }
    } else {
      const accessToken = (options?.headers as A).Authorization.split(
        'Bearer ',
      )[1];
      redirect(`/logout?accessToken=${accessToken}`);
    }
  }

  // ensure this logic can just work in client side (browser)
  if (isClient) {
    const normalizeUrl = normalizePath(url);
    if (normalizeUrl === 'api/auth/login') {
      const { accessToken, refreshToken } = (payload as LoginResType).data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } else if (normalizeUrl === 'api/auth/logout') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  return data;
};

const http = {
  get<Response>(
    url: string,
    options?: Omit<CustomOptions, 'body'> | undefined,
  ) {
    return request<Response>('GET', url, options);
  },
  post<Response>(
    url: string,
    body: A,
    options?: Omit<CustomOptions, 'body'> | undefined,
  ) {
    return request<Response>('POST', url, { ...options, body });
  },
  put<Response>(
    url: string,
    body: A,
    options?: Omit<CustomOptions, 'body'> | undefined,
  ) {
    return request<Response>('PUT', url, { ...options, body });
  },
  delete<Response>(
    url: string,
    options?: Omit<CustomOptions, 'body'> | undefined,
  ) {
    return request<Response>('DELETE', url, { ...options });
  },
};

export default http;
