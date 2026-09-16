import { HttpRequest } from "./HttpRequest";
import { HttpResponse } from "./HttpResponse";

export type RequestHistoryEntry = {
  request: HttpRequest;
  timestamp: string;
  response?: HttpResponse;
};
