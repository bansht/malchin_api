import jwt from "jsonwebtoken";

export const context = ({ req }) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  let user = null;
  if (token) {
    user = jwt.verify(token, process.env.JWT_SECRET);
  }

  return { user };
};
