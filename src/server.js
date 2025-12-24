import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./graphql/typeDefs.js";
import resolvers from "./graphql/resolvers.js";
import { getUserFromToken, hashPassword } from "./lib/auth.js";
import prisma from "./lib/prisma.js";

const PORT = process.env.PORT || 4000;

async function startServer() {
  await ensureDefaultAdmin();

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  const { url } = await startStandaloneServer(apolloServer, {
    listen: { port: PORT },

    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://malchinapi-production.up.railway.app",
      ],
      credentials: true,
    },

    context: async ({ req }) => {
      const user = await getUserFromToken(req, prisma);
      return {
        req,
        user,
        prisma,
      };
    },
  });

  console.log(`🚀 GraphQL ажиллаж байна ${url}`);
}

async function ensureDefaultAdmin() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@gmail.com";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`👮 Admin user already exists (${adminEmail})`);
      return;
    }

    const passwordHash = await hashPassword(adminPassword);

    await prisma.user.create({
      data: {
        name: "Administrator",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });

    console.log("✅ Default admin user created");
  } catch (error) {
    console.error("❌ Failed to ensure default admin user", error);
  }
}

startServer();
