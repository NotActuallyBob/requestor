import { HttpMethod } from './HttpMethod';

export type HttpRequest = {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: Record<string, string>;
}