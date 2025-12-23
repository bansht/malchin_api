import prisma from "../lib/prisma";
import { GraphQLError } from "graphql";

export async function getUsers() {
  const users = await prisma.user.findMany({
    include: {
      products: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  return users;
}

export async function updateUser(id, data) {
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
}

export async function deleteUser(id) {
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
}
