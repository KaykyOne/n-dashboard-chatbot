import { PrismaPg } from '@prisma/adapter-pg'
import { databaseEnv } from '../src/env'
import { PrismaClient } from '../generated/prisma/client'

const connectionString = databaseEnv.DATABASE_URL

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma;
