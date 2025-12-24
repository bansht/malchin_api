import prisma from "../lib/prisma.js";
import { GraphQLError } from "graphql";

export const createProduct = async (_, { input }, context) => {
  try {
    if (!context.user) {
      throw new GraphQLError("Та эхлээд нэвтэрнэ үү", {
        extensions: { code: "UNAUTHORIZED" },
      });
    }

    const {
      title,
      description,
      price,
      unit,
      quantity,
      location,
      images,
      status,
      attributes,
      categoryId,
    } = input;

    if (!title || !price || !categoryId) {
      throw new GraphQLError("Шаардлагатай талбар дутуу", {
        extensions: { code: "BAD_REQUEST" },
      });
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        unit,
        quantity,
        location,
        images,
        status,
        attributes,
        categoryId,
        userId: context.user.id,
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return serializeProduct(product);
  } catch (error) {
    console.error(error);
    throw new GraphQLError("Бүтээгдэхүүн үүсгэхэд алдаа гарлаа", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
};

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!product) {
    throw new GraphQLError("Бүтээгдэхүүн олдсонгүй", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return serializeProduct(product);
};


export const getProducts = async () => {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return products.map(serializeProduct);
};

export const updateProduct = async (_, { input }, context) => {
  const { id, ...updateData } = input;

  if (!id) {
    throw new GraphQLError("Product ID заавал шаардлагатай", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  if (!context.user) {
    throw new GraphQLError("Та эхлээд нэвтэрнэ үү", {
      extensions: { code: "UNAUTHORIZED" },
    });
  }

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new GraphQLError("Бүтээгдэхүүн олдсонгүй", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  if (
    product.userId !== context.user.id &&
    context.user.role !== "ADMIN"
  ) {
    throw new GraphQLError("Зөвшөөрөлгүй", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return serializeProduct(updated);
};

export const deleteProduct = async (_, { id }, context) => {
  if (!context.user || context.user.role !== "ADMIN") {
    throw new GraphQLError("Зөвшөөрөлгүй", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  await prisma.product.delete({ where: { id } });

  return true;
};

function serializeProduct(product) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
