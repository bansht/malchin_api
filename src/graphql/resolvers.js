import { GraphQLError } from "graphql";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/category.js";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.js";
import prisma from "../lib/prisma.js";
import {
  hashPassword,
  comparePasswords,
  generateToken,
  requireAuth,
} from "../lib/auth.js";

const resolvers = {
  Query: {
    users: async () => {
      return await prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          products: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    },
    user: async (_, { id }) => {
      return await prisma.user.findUnique({
        where: { id },
      });
    },
    getUserProfile: async (_, __, { user }) => {
      requireAuth(user);
      return user;
    },
    products: async () => getProducts(),
    product: async (_, { id }) => getProductById(id),
    categories: () => getCategories(),
  },

  Mutation: {
    createUser: async (_, { name, email }) => {
      return await prisma.user.create({
        data: {
          name,
          email,
        },
      });
    },
    register: async (_, { input }) => {
      const { name, email, phone, address, password } = input;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new GraphQLError("User with this email already exists", {
          extensions: { code: "USER_ALREADY_EXISTS" },
        });
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          address,
          passwordHash,
        },
      });

      const token = generateToken(user);

      return {
        token,
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },
    login: async (_, { input }) => {
      const { email, password } = input;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new GraphQLError("Нууц үг эсвэл имэйл буруу байна.", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      const isValidPassword = await comparePasswords(
        password,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new GraphQLError("Нууц үг эсвэл имэйл буруу байна.", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      const token = generateToken(user);

      return {
        token,
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },

    createProduct: async (_, { input }, context) => {
      return await createProduct(_, { input }, context);
    },
    updateProduct: async (_, { id, input }, context) => {
      return await updateProduct(_, { id, input }, context);
    },
    deleteProduct: async (_, { id }, context) => {
      return await deleteProduct(_, { id }, context);
    },

    createCategory: async (_, { input }, { user }) => {
      return await createCategory(input, user);
    },

    updateCategory: async (_, { id, input }, { user }) => {
      return await updateCategory(id, input, user);
    },

    deleteCategory: async (_, { id }, { user }) => {
      return await deleteCategory(id, user);
    },
  },
};

export default resolvers;
