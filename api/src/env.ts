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
  PROMPT_IMPROVEMENT_MODEL: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).default("gpt-5.5"),
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
  BOT_MESSAGE_DEBOUNCE_MS: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().nonnegative().default(3000),
  ),
  BOT_TYPING_DELAY_MS: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().nonnegative().default(1200),
  ),
  BOT_PART_DELAY_MS: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().nonnegative().default(800),
  ),
  BOT_MAX_MESSAGE_AGE_SECONDS: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().default(120),
  ),
  WHATSAPP_NOTIFICATION_API_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url().optional(),
  ),
  WHATSAPP_NOTIFICATION_API_TOKEN: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  CORS_ORIGIN: z.preprocess(
    emptyStringToUndefined,
    z.string().url().default("http://localhost:3000"),
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
  envSchema.pick({
    BOT_MESSAGE_DEBOUNCE_MS: true,
    BOT_MAX_MESSAGE_AGE_SECONDS: true,
    BOT_PART_DELAY_MS: true,
    BOT_TYPING_DELAY_MS: true,
    WHATSAPP_NOTIFICATION_API_TOKEN: true,
    WHATSAPP_NOTIFICATION_API_URL: true,
    CORS_ORIGIN: true,
    PORT: true
  }),
  "server",
);
const openAiEnv = parseEnv(
  envSchema.pick({
    OPENAI_KEY: true,
    PROMPT_IMPROVEMENT_MODEL: true,
  }),
  "openai",
);
const databaseEnv = parseEnv(
  envSchema.pick({ DATABASE_URL: true, DIRECT_URL: true }),
  "database",
);
const env = parseEnv(envSchema, "application");

export { databaseEnv, env, envSchema, openAiEnv, serverEnv };
