import { customAlphabet } from "nanoid";
import prisma from "../lib/prisma.js";
import { GraphQLError } from "graphql";

export const createCategory = async (req, res) => {
    try {
        const { name, slug, type, parentId } = req.body;
        const newCategory = {
            id: customAlphabet(chars, 12)(),
            name,
            slug,
            type,
            parentId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    }
    catch (error) {
        console.error("Ангилал үүсгэхэд алдаа гарлаа:", error);
       throwNotFoundError("Дотоод серверийн алдаа");
    }
}

export async function getCategories() {
    return await prisma.category.findMany();
}

export async function updateCategory(id, data) {
    return prisma.category.update({
        where: { id },
        data
    });
}

export async function deleteCategory(id) {
    return await prisma.category.delete({
        where: { id }
    });
}

function throwNotFoundError(message) {
  throw new GraphQLError(message, {
    extensions: { code: "NOT_FOUND" },
  });
}
