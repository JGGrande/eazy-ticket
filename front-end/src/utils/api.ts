import { API_URL } from "@/config/env";
import { JWT_TOKEN } from "@/config/ls-token";

export type RequestPath = string;
export type RequestBody = object | object[];

export class API {
  static getAPIUrl(path: string): URL {
    const apiUrl = API_URL;

    if (!apiUrl) {
      throw new Error("API URL is not defined. Please set VITE_API_URL in your environment variables.");
    }

    const url = new URL(path, apiUrl);

    if (!url.protocol || !url.host) {
      throw new Error(`Invalid API URL: ${url.toString()}. Ensure the path is correct.`);
    }

    return url;
  }

  static async get(path: RequestPath): Promise<Response> {
    const url = API.getAPIUrl(path);
    const token = localStorage.getItem(JWT_TOKEN);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return response;
  }

  static async post(path: RequestPath, data: RequestBody): Promise<Response> {
    const url = API.getAPIUrl(path);
    const token = localStorage.getItem(JWT_TOKEN);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    return response;
  }

  static async put(path: RequestPath, data: RequestBody): Promise<Response> {
    const url = API.getAPIUrl(path);
    const token = localStorage.getItem(JWT_TOKEN);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    return response;
  }

  static async delete(path: RequestPath): Promise<Response> {
    const url = API.getAPIUrl(path);
    const token = localStorage.getItem(JWT_TOKEN);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return response;
  }
}