import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  schemaFingerprint?: string;
};

function createPrismaClient() {
  return new PrismaClient();
}

function modelDelegateKey(model: Prisma.ModelName): keyof PrismaClient {
  return (model.charAt(0).toLowerCase() + model.slice(1)) as keyof PrismaClient;
}

/** Cambia cuando el schema de Prisma se regenera (modelos o campos nuevos). */
function getSchemaFingerprint(): string {
  const models = Object.values(Prisma.ModelName).sort().join(",");
  const userFields = Object.keys(Prisma.UserScalarFieldEnum).sort().join(",");
  return `${models}|${userFields}`;
}

function isStalePrismaClient(client: PrismaClient, fingerprint: string): boolean {
  if (globalForPrisma.schemaFingerprint !== fingerprint) return true;
  return Object.values(Prisma.ModelName).some(
    (model) => typeof client[modelDelegateKey(model)] === "undefined"
  );
}

function resolvePrismaClient(): PrismaClient {
  const fingerprint = getSchemaFingerprint();
  const cached = globalForPrisma.prisma;

  if (cached && !isStalePrismaClient(cached, fingerprint)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {});
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.schemaFingerprint = fingerprint;
  return client;
}

export const prisma = resolvePrismaClient();
export default prisma;
