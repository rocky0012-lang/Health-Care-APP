import * as sdk from "node-appwrite";

export const {
    PROJECT_ID,
    API_KEY,
    DATABASE_ID,
    PATIENT_TABLE_ID,
  PATIENT_VITALS_TABLE_ID,
  PATIENT_DIAGNOSIS_TABLE_ID,
  PATIENT_PRESCRIPTION_TABLE_ID,
    DOCTOR_TABLE_ID,
    APPOINTMENT_TABLE_ID,
    NEXT_PUBLIC_BUCKET_ID: BUCKET_ID,
    NEXT_PUBLIC_ENDPOINT: ENDPOINT,
} = process.env;

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const APPWRITE_ENDPOINT = requireEnv("NEXT_PUBLIC_ENDPOINT", ENDPOINT)
const APPWRITE_PROJECT_ID = requireEnv("PROJECT_ID", PROJECT_ID)
const APPWRITE_API_KEY = requireEnv("API_KEY", API_KEY)

const client = new sdk.Client();

client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

export const databases = new sdk.Databases(client);
export const tablesDB = new sdk.TablesDB(client);
export const storage = new sdk.Storage(client);
export const messaging = new sdk.Messaging(client);
export const functions = new sdk.Functions(client);
export const users = new sdk.Users(client);
export const account = new sdk.Account(client);