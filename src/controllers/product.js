import { customAlphabet } from "nanoid";
import prisma from "../lib/prisma.js";
import { GraphQLError } from "graphql";

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const createProduct = async (req, res) => {
    try {
        const { title, description, price, unit, quantity, location, images, status, attributes, categoryId, userId } = req.body;

        const newProduct = await prisma.product.create({
            data: {
                id: customAlphabet(chars, 12)(),
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
                userId,
            }
        });
        return newProduct;
    } catch (error) {
        console.error("Бүтээгдэхүүн үүсгэхэд алдаа гарлаа:", error);
        throwNotFoundError("Дотоод серверийн алдаа");
    }
};

export async function getProductById(id) {
  return await prisma.product.findUnique({ where: { id }});
};

export async function getProducts() {
  return await prisma.product.findMany();
};

export async function updateProduct(id, data) {
  return await prisma.product.update({
    where : { id },
    data
  })
};

export async function deleteProduct(id) {
  return await prisma.product.delete({
    where : { id }
  });
}

function throwNotFoundError(message) {
  throw new GraphQLError(message, {
    extensions: { code: "NOT_FOUND" },
  });
}
