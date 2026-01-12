import admin from "firebase-admin";

export default async function (req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(token);
  req.user = decoded;
  next();
}
