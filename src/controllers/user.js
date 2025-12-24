import prisma from "../lib/prisma.js";
import { GraphQLError } from "graphql";

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      products: {
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          images: true,
        },
      },
    },
  });

  return users.map(serializeProduct);
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new GraphQLError("Хэрэглэгч олдсонгүй", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return user;
};

export const updateUser = async (id, data) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error(error);
    throw new GraphQLError("Хэрэглэгч засахад алдаа гарлаа", {
      extensions: { code: "BAD_REQUEST" },
    });
  }
};

export const deleteUser = async (id) => {
  try {
    const productCount = await prisma.product.count({
      where: { userId: id },
    });

    if (productCount > 0) {
      throw new GraphQLError(
        "Энэ хэрэглэгч бүтээгдэхүүнтэй тул устгах боломжгүй",
        { extensions: { code: "FORBIDDEN" } }
      );
    }

    return await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

function serializeProduct(product) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
