export type HttpResponse = {
    statusCode: number;
    time_ms: number;
    headers: Record<string, string>;
    body: string;
}