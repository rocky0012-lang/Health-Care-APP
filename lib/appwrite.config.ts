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

const client = new sdk.Client();

client
  .setEndpoint(ENDPOINT!)
  .setProject(PROJECT_ID!)
  .setKey(API_KEY!);

export const databases = new sdk.Databases(client);
export const tablesDB = new sdk.TablesDB(client);
export const storage = new sdk.Storage(client);
export const messaging = new sdk.Messaging(client);
export const users = new sdk.Users(client);