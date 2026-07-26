import "dotenv/config";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

const databaseUrlSchema = z
  .string()
  .min(1, "Database URL is required")
  .refine(
    (value) => /^postgres(?:ql)?:\/\//.test(value),
    "Database URL must start with postgres:// or postgresql://",
  );

const envSchema = z.object({
  OPENAI_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1, "OPENAI_KEY is required"),
  ),
  DATABASE_URL: z.preprocess(
    emptyStringToUndefined,
    databaseUrlSchema,
  ),
  DIRECT_URL: z.preprocess(
    emptyStringToUndefined,
    databaseUrlSchema,
  ),
  PORT: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().default(3009),
  ),
  WHATSAPP_PROVIDER: z.preprocess(
    emptyStringToUndefined,
    z.enum(["BAILEYS", "WEBJS"]).default("BAILEYS"),
  ),
});

const formatIssues = (scope: string, issues: z.ZodIssue[]) => {
  const formattedErrors = issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  return `Invalid environment variables for ${scope}:\n${formattedErrors}`;
};

const parseEnv = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  scope: string,
): z.infer<TSchema> => {
  const parsedEnv = schema.safeParse(process.env);

  if (!parsedEnv.success) {
    throw new Error(formatIssues(scope, parsedEnv.error.issues));
  }

  return parsedEnv.data;
};

const serverEnv = parseEnv(
  envSchema.pick({ PORT: true, WHATSAPP_PROVIDER: true }),
  "server",
);
const openAiEnv = parseEnv(envSchema.pick({ OPENAI_KEY: true }), "openai");
const databaseEnv = parseEnv(
  envSchema.pick({ DATABASE_URL: true, DIRECT_URL: true }),
  "database",
);
const env = parseEnv(envSchema, "application");

export { databaseEnv, env, envSchema, openAiEnv, serverEnv };
