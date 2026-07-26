import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const apiURL = process.env.NEXT_PUBLIC_SUPABASE_URL;

let client;

function getSupabaseClient() {
  if (client) return client;

  if (!apiURL || !apiKey) {
    if (typeof window === "undefined") {
      return null;
    }

    throw new Error("Supabase environment variables are missing.");
  }

  client = createClient(apiURL, apiKey);
  return client;
}

/** @type {any} */
const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const currentClient = getSupabaseClient();

      if (!currentClient) {
        throw new Error("Supabase client is unavailable during prerender.");
      }

      const value = currentClient[prop];
      return typeof value === "function" ? value.bind(currentClient) : value;
    },
  }
);

export { supabase };
