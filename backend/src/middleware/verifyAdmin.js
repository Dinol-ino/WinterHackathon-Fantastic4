import db from "../config/firebase.js";

export default async function (req, res, next) {
  const doc = await db.collection("users").doc(req.user.uid).get();
  if (doc.data().role !== "admin") return res.sendStatus(403);
  next();
}
