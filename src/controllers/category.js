import prisma from "../lib/prisma.js";
import { GraphQLError } from "graphql";


export const createCategory = async ({ name, slug, type, parentId }, user) => {
  if (!user) {
    throw new GraphQLError("Та эхлээд нэвтэрнэ үү", { extensions: { code: "UNAUTHORIZED" } });
  }

  if (user.role !== "ADMIN") {
    throw new GraphQLError("Зөвшөөрөлгүй", { extensions: { code: "FORBIDDEN" } });
  }

  if (!name || !slug || !type) {
    throw new GraphQLError("Name, slug, type нь заавал шаардлагатай", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  try {
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        type,
        parentId: parentId || null,
      },
    });

    return serializeCategory(category);
  } catch (error) {
    console.error("Ангилал үүсгэхэд алдаа гарлаа:", error);
    throw new GraphQLError("Дотоод серверийн алдаа", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
};


export const getCategories = async () => {
  const categories = await prisma.category.findMany({
    include: {
      children: true, 
      products: {
        select: { id: true, title: true },
      },
    },
  });

  return categories.map(serializeCategory);
};


export const updateCategory = async (id, data, user) => {
  requireAdmin(user);

  try {
    const updated = await prisma.category.update({
      where: { id },
      data,
      include: {
        children: true,
        products: {
          select: { id: true, title: true },
        },
      },
    });

    return serializeCategory(updated);
  } catch (error) {
    console.error("Ангилал засахад алдаа гарлаа:", error);
    throw new GraphQLError("Дотоод серверийн алдаа", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
};


export const deleteCategory = async (id, user) => {
  requireAdmin(user);

  try {
    return await prisma.category.delete({ where: { id } });
  } catch (error) {
    console.error("Ангилал устгахад алдаа гарлаа:", error);
    throw new GraphQLError("Дотоод серверийн алдаа", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
};


export function serializeCategory(category) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}


function requireAdmin(user) {
  if (!user) throw new GraphQLError("Та эхлээд нэвтэрнэ үү", { extensions: { code: "UNAUTHORIZED" } });
  if (user.role !== "ADMIN") throw new GraphQLError("Зөвшөөрөлгүй", { extensions: { code: "FORBIDDEN" } });
}
