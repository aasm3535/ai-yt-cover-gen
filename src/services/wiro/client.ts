import { WiroRunRequest, WiroRunResponse, WiroDetailResponse, WiroModel } from './types';

// Helper to generate HMAC-SHA256 signature using Web Crypto API
async function generateSignature(apiKey: string, apiSecret: string, nonce: string): Promise<string> {
  const encoder = new TextEncoder();

  // The curl command is: echo -n "${YOUR_API_SECRET}${NONCE}" | openssl dgst -sha256 -hmac "${YOUR_API_KEY}"
  // This means the HMAC key is the API_KEY, and the message is SECRET + NONCE.
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(apiSecret + nonce);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convert ArrayBuffer to hex string
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface WiroCredentials {
  apiKey: string;
  apiSecret: string;
}

export class WiroClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = '/wiro-api';

  constructor(credentials: WiroCredentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
  }

  private async getAuthHeaders(): Promise<Headers> {
    const nonce = Math.floor(Date.now() / 1000).toString();
    const signature = await generateSignature(this.apiKey, this.apiSecret, nonce);

    const headers = new Headers();
    headers.append('x-api-key', this.apiKey);
    headers.append('x-nonce', nonce);
    headers.append('x-signature', signature);

    return headers;
  }

  public async runTask(model: WiroModel, request: WiroRunRequest): Promise<WiroRunResponse> {
    const url = `${this.baseUrl}/Run/${model}`;
    const headers = await this.getAuthHeaders();

    const formData = new FormData();
    if (request.inputImage) {
      formData.append('inputImage', request.inputImage);
    }
    formData.append('prompt', request.prompt);
    formData.append('aspectRatio', request.aspectRatio || '');
    formData.append('resolution', request.resolution || '1K');
    formData.append('safetySetting', request.safetySetting || 'OFF');

    if (request.callbackUrl) {
      formData.append('callbackUrl', request.callbackUrl);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers, // Do NOT set Content-Type here, let the browser set it with the boundary for FormData
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wiro API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  public async getTaskDetail(taskId: string): Promise<WiroDetailResponse> {
    const url = `${this.baseUrl}/Task/Detail`;
    const headers = await this.getAuthHeaders();

    const formData = new FormData();
    formData.append('taskid', taskId);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wiro API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
}
