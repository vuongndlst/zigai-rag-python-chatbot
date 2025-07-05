// lib/astra.ts
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
} = process.env;

if (!ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_NAMESPACE) {
  throw new Error("Thiếu biến môi trường Astra DB");
}

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

// 👉 Export db cho Vector Search (tài liệu, không phải chat)
export const astraDb = client.db(ASTRA_DB_API_ENDPOINT, {
  namespace: ASTRA_DB_NAMESPACE,
});
