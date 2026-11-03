import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { GarminError } from "./errors";

type Consumer = { key: string; secret: string };

const CONSUMER_URL = "https://thegarth.s3.amazonaws.com/oauth_consumer.json";
let consumer: Promise<Consumer> | undefined;

/**
 * Garmin Connect mobile app consumer credentials, published by the garth project.
 * Can be pinned with GARMIN_CONSUMER_KEY / GARMIN_CONSUMER_SECRET.
 */
export function getConsumer(): Promise<Consumer> {
  const { GARMIN_CONSUMER_KEY: key, GARMIN_CONSUMER_SECRET: secret } = process.env;
  if (key && secret) return Promise.resolve({ key, secret });

  consumer ??= fetch(CONSUMER_URL, { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new GarminError("unavailable", "OAuth consumer unavailable");
      return res.json() as Promise<{ consumer_key: string; consumer_secret: string }>;
    })
    .then((json) => ({ key: json.consumer_key, secret: json.consumer_secret }))
    .catch((error: unknown) => {
      consumer = undefined;
      throw error;
    });
  return consumer;
}

const encode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Builds an OAuth 1.0a HMAC-SHA1 `Authorization` header. */
export function oauth1Header({
  method,
  url,
  consumer,
  token,
  body,
}: {
  method: "GET" | "POST";
  url: string;
  consumer: Consumer;
  token?: { key: string; secret: string };
  body?: URLSearchParams;
}) {
  const target = new URL(url);
  const oauth: Record<string, string> = {
    oauth_consumer_key: consumer.key,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...(token && { oauth_token: token.key }),
  };

  const params = [...target.searchParams, ...(body ?? []), ...Object.entries(oauth)]
    .map(([k, v]) => [encode(k), encode(v)] as const)
    .sort(([ak, av], [bk, bv]) => (ak === bk ? (av < bv ? -1 : 1) : ak < bk ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const baseUrl = `${target.origin}${target.pathname}`;
  const baseString = [method, encode(baseUrl), encode(params)].join("&");
  const signingKey = `${encode(consumer.secret)}&${encode(token?.secret ?? "")}`;
  oauth.oauth_signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  return (
    "OAuth " +
    Object.entries(oauth)
      .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
      .join(", ")
  );
}
