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
import { getUserById, getUsers } from "../controllers/user.js";
import {
  hashPassword,
  comparePasswords,
  generateToken,
  requireAuth,
} from "../lib/auth.js";
import {
  generateOTP,
  getOTPExpiry,
  sendOTPViaSMS,
  verifyOTP,
} from "../lib/otp.js";

const resolvers = {
  Query: {
    users: async () => getUsers(),
    user: async (_, { id }) => getUserById(id),
    getUserProfile: async (_, __, { user }) => {
      requireAuth(user);
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          products: true,
        },
      });

      return userProfile;
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

    sendOTP: async (_, { input }) => {
      let { phone } = input;

      phone = phone.replace(/\D/g, "");
      if (phone.length === 8) {
        phone = `${phone}`;
      }

      console.log("📱 [SEND OTP] Phone:", phone);

      const existingUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingUser?.isVerified) {
        throw new GraphQLError(
          "Энэ утасны дугаар аль хэдийн бүртгэлтэй байна",
          { extensions: { code: "USER_ALREADY_EXISTS" } },
        );
      }

      const otpCode = generateOTP();
      const otpExpiry = getOTPExpiry();

      console.log("🔐 [SEND OTP] OTP:", otpCode, "Expiry:", otpExpiry);

      if (existingUser) {
        await prisma.user.update({
          where: { phone },
          data: { otpCode, otpExpiry },
        });
      } else {
        await prisma.user.create({
          data: {
            phone,
            otpCode,
            otpExpiry,
            isVerified: false,
          },
        });
      }

      try {
        await sendOTPViaSMS(phone, otpCode);

        return {
          success: true,
          message: "OTP код таны утсанд илгээгдлээ",
        };
      } catch (err) {
        console.error("❌ [SEND OTP] SMS ERROR:", err.message);

        throw new GraphQLError(err.message, {
          extensions: {
            code: "SMS_SEND_FAILED",
          },
        });
      }
    },

    verifyOTP: async (_, { input }) => {
      let { phone, otp } = input;

      phone = phone.replace(/\D/g, "");
      if (phone.length === 8) {
        phone = `${phone}`;
      }

      console.log("✅ [VERIFY OTP] Phone:", phone, "OTP:", otp);

      const user = await prisma.user.findUnique({
        where: { phone },
      });

      if (!user?.otpCode || !user?.otpExpiry) {
        throw new GraphQLError("OTP код олдсонгүй", {
          extensions: { code: "OTP_NOT_FOUND" },
        });
      }

      const isValid = verifyOTP(otp, user.otpCode, user.otpExpiry);

      if (!isValid) {
        throw new GraphQLError("OTP код буруу эсвэл хугацаа дууссан байна", {
          extensions: { code: "INVALID_OTP" },
        });
      }

      await prisma.user.update({
        where: { phone },
        data: {
          isVerified: true,
          otpCode: null,
          otpExpiry: null,
        },
      });

      console.log("✅ [VERIFY OTP] Verified");

      return {
        success: true,
        message: "Утасны дугаар амжилттай баталгаажлаа",
      };
    },

    register: async (_, { input }) => {
      const { name, email, phone, address, password } = input;

      function normalizePhone(phone) {
        let p = phone.replace(/\D/g, "");

        if (p.length === 8) p = "" + p;

        return p;
      }

      const normalizedPhone = normalizePhone(phone);

      console.log(
        "📝 [REGISTER] Starting registration for phone:",
        normalizedPhone,
      );

      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        throw new GraphQLError("Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна", {
          extensions: { code: "EMAIL_ALREADY_EXISTS" },
        });
      }

      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      
      
      });  


      if (existingUserByPhone && !existingUserByPhone.isVerified) {
        console.log("📝 [REGISTER] Updating unverified user and resending OTP");

        const passwordHash = await hashPassword(password);
        const otpCode = generateOTP();
        const otpExpiry = getOTPExpiry();

        const updatedUser = await prisma.user.update({
          where: { id: existingUserByPhone.id },
          data: {
            name,
            email,
            address,
            passwordHash,
            otpCode,
            otpExpiry,
          },
        });

        try {
          await sendOTPViaSMS(normalizedPhone, otpCode);
          console.log("✅ [REGISTER] OTP resent to existing unverified user");
        } catch (error) {
          console.error("❌ [REGISTER] Failed to send OTP:", error);
          throw new GraphQLError(error.message, {
            extensions: { code: "SMS_SEND_FAILED" },
          });
        }

        return {
          token: "",
          user: {
            ...updatedUser,
            createdAt: updatedUser.createdAt.toISOString(),
            updatedAt: updatedUser.updatedAt.toISOString(),
          },
        };
      }

      if (existingUserByPhone && existingUserByPhone.isVerified) {
        throw new GraphQLError(
          "Энэ утасны дугаар аль хэдийн бүртгэлтэй байна",
          {
            extensions: { code: "PHONE_ALREADY_EXISTS" },
          },
        );
      }

      const passwordHash = await hashPassword(password);
      const otpCode = generateOTP();
      const otpExpiry = getOTPExpiry();

      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone: normalizedPhone,
          address,
          passwordHash,
          isVerified: false,
          otpCode,
          otpExpiry,
        },
      });

      console.log("✅ [REGISTER] User created, sending OTP...");

      try {
        await sendOTPViaSMS(normalizedPhone, otpCode);
        console.log("✅ [REGISTER] OTP sent successfully");
      } catch (error) {
        console.error("❌ [REGISTER] Failed to send OTP:", error);

        await prisma.user.delete({ where: { id: user.id } });

        throw new GraphQLError(error.message, {
          extensions: { code: "SMS_SEND_FAILED" },
        });
      }

      return {
        token: "",
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },

    login: async (_, { input }) => {
      const allUsers = await prisma.user.findMany({
        select: { id: true, phone: true },
      });
      console.log("[LOGIN] All user phones:", allUsers);

      const { email, password, phone } = input;
      let user;
      const normalizedPhone = phone ? phone.replace(/\D/g, "") : undefined;

      console.log(
        "[LOGIN] Input email:",
        email,
        "Input phone:",
        phone,
        "Normalized phone:",
        normalizedPhone,
      );

      if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      } else if (normalizedPhone) {
        user = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
        });
        if (!user) {
          user = await prisma.user.findFirst({
            where: { phone: { contains: normalizedPhone } },
          });
          console.log(
            "[LOGIN] Fallback findFirst by phone, found:",
            user ? user.id : null,
          );
        }
      }

      console.log("[LOGIN] Found user:", user ? user.id : null);

      if (!user) {
        throw new GraphQLError(
          "Нууц үг, имэйл эсвэл утасны дугаар буруу байна.",
          {
            extensions: { code: "INVALID_CREDENTIALS" },
          },
        );
      }

      if (!user.isVerified) {
        throw new GraphQLError("Та эхлээд утасны дугаараа баталгаажуулна уу", {
          extensions: { code: "USER_NOT_VERIFIED" },
        });
      }

      const isValidPassword = await comparePasswords(
        password,
        user.passwordHash,
      );
      if (!isValidPassword) {
        throw new GraphQLError(
          "Нууц үг, имэйл эсвэл утасны дугаар буруу байна.",
          {
            extensions: { code: "INVALID_CREDENTIALS" },
          },
        );
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

    updateCategory: async (_, { input }, { user }) => {
      const { id, ...data } = input;
      return await updateCategory(id, data, user);
    },

    deleteCategory: async (_, { id }, { user }) => {
      return await deleteCategory(id, user);
    },
  },
};

export default resolvers;
