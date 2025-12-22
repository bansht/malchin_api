import { GraphQLError } from "graphql";
import { getCategories } from "../controllers/category.js";
import { createProduct, getProducts, updateProduct, getProductById } from "../controllers/product.js";
import prisma from "../lib/prisma.js";
import {
  hashPassword,
  comparePasswords,
  generateToken,
  requireAuth
} from "../lib/auth.js";

const resolvers = {
  Query: {
    users: async () => {
      return await prisma.user.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
    },
    user: async (_, { id }) => {
      return await prisma.user.findUnique({
        where: { id }
      });
    },
    getUserProfile: async (_, __, { user }) => {
      requireAuth(user);
      return user;
    },
    products: async () => {
      const products = await prisma.product.findMany();
      return products.map(product => ({
        ...product,
        createdAt: product.createdAt.toISOString()
      }));
    },
    product: async (root, { id }) => {
      const product = await getProductById(id);
      if (!product) {
        throwNotFoundError(`${id}-тай бүтээгдэхүүн олдсонгүй`);
      }
      return product;
    },
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
        where: { email }
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
        where: { email }
      });

      if (!user) {
        throw new GraphQLError("Invalid email or password", {
          extensions: { code: "INVALID_CREDENTIALS" },
        });
      }

      const isValidPassword = await comparePasswords(password, user.passwordHash);

      if (!isValidPassword) {
        throw new GraphQLError("Invalid email or password", {
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
    socialAuth: async (_, { email, device = "web" }) => {
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        const name = email.split('@')[0];

        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: '',
          },
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
    createProduct: async (root, { input: { title, description, price, unit, quantity, location, images, status, attributes, categoryId, userId } }, { user }) => {
      requireAuth(user);
      
      if (user.role !== 'admin' && userId !== user.id) {
        throw new GraphQLError("You can only create products for yourself", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      
      return await prisma.product.create({
        data: { title, description, price, unit, quantity, location, images, status, attributes, categoryId, userId }
      })
    },
    createCategory: async (root, { input }, { user }) => {
      requireAuth(user);
      
      if (user.role !== 'admin') {
        throw new GraphQLError("Only administrators can create categories", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      
      const { name, slug, type, parentId } = input;

      if (!name || !slug || !type) {
        throw new GraphQLError("Name, slug, and type are required fields", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      return await prisma.category.create({
        data: {
          name,
          slug,
          type,
          parentId: parentId || null,
        },
      });
    },
    updateProduct: async (root, { input: { id, ...data } }, { user }) => {
      requireAuth(user);
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new GraphQLError("Product not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      
      if (user.role !== 'admin' && product.userId !== user.id) {
        throw new GraphQLError("You can only update your own products", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      
      return await prisma.product.update({
        where: { id },
        data
      });
    },
    updateCategory: async (root, { input: { id, ...data } }, { user }) => {
      requireAuth(user);
      
      if (user.role !== 'admin') {
        throw new GraphQLError("Only administrators can update categories", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      
      return await prisma.category.update({
        where: { id },
        data
      });
    },
    deleteProduct: async (root, { id }, { user }) => {
      requireAuth(user);
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new GraphQLError("Product not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      
      if (user.role !== 'admin' && product.userId !== user.id) {
        throw new GraphQLError("You can only delete your own products", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      
      await prisma.product.delete({
        where: { id }
      });
      return true;
    },
    deleteCategory: async (root, { id }, { user }) => {
      requireAuth(user);
      
      if (user.role !== 'admin') {
        throw new GraphQLError("Only administrators can delete categories", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      
      const productsCount = await prisma.product.count({
        where: { categoryId: id }
      });

      if (productsCount > 0) {
        throw new GraphQLError(`Cannot delete category. ${productsCount} product(s) are using this category.`, {
          extensions: { code: "CATEGORY_IN_USE" },
        });
      }

      await prisma.category.delete({
        where: { id }
      });
      return true;
    }
  },
};

export default resolvers;

function throwNotFoundError(message) {
  throw new GraphQLError(message, {
    extensions: { code: "NOT_FOUND" },
  });
}
