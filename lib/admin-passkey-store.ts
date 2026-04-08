"use server"

import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"

type StoredAdminPasskeyRecord = {
  salt: string
  hash: string
  updatedAt: string
}

const DEFAULT_ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || "567468"
const ADMIN_PASSKEY_STORE_PATH = path.join(process.cwd(), ".admin", "passkey.json")

function isSixDigitPasskey(passkey: string) {
  return /^\d{6}$/.test(passkey)
}

function hashPasskey(passkey: string, salt: string) {
  return scryptSync(passkey, salt, 64).toString("hex")
}

async function readStoredAdminPasskeyRecord(): Promise<StoredAdminPasskeyRecord | null> {
  try {
    const fileContents = await readFile(ADMIN_PASSKEY_STORE_PATH, "utf8")
    const parsed = JSON.parse(fileContents) as Partial<StoredAdminPasskeyRecord>

    if (
      typeof parsed?.salt !== "string" ||
      typeof parsed?.hash !== "string" ||
      typeof parsed?.updatedAt !== "string"
    ) {
      return null
    }

    return {
      salt: parsed.salt,
      hash: parsed.hash,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

async function writeStoredAdminPasskeyRecord(passkey: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = hashPasskey(passkey, salt)

  await mkdir(path.dirname(ADMIN_PASSKEY_STORE_PATH), { recursive: true })
  await writeFile(
    ADMIN_PASSKEY_STORE_PATH,
    JSON.stringify(
      {
        salt,
        hash,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  )
}

export async function verifyAdminPasskey(passkey: string) {
  const normalizedPasskey = passkey.trim()

  if (!isSixDigitPasskey(normalizedPasskey)) {
    return false
  }

  const storedRecord = await readStoredAdminPasskeyRecord()

  if (!storedRecord) {
    return normalizedPasskey === DEFAULT_ADMIN_PASSKEY
  }

  const expectedHash = Buffer.from(hashPasskey(normalizedPasskey, storedRecord.salt), "hex")
  const currentHash = Buffer.from(storedRecord.hash, "hex")

  if (expectedHash.length !== currentHash.length) {
    return false
  }

  return timingSafeEqual(expectedHash, currentHash)
}

export async function updateStoredAdminPasskey(currentPasskey: string, nextPasskey: string) {
  const currentMatches = await verifyAdminPasskey(currentPasskey)

  if (!currentMatches) {
    throw new Error("Current admin passkey is incorrect.")
  }

  const normalizedNextPasskey = nextPasskey.trim()

  if (!isSixDigitPasskey(normalizedNextPasskey)) {
    throw new Error("New admin passkey must be exactly 6 digits.")
  }

  await writeStoredAdminPasskeyRecord(normalizedNextPasskey)
}