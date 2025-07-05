import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Xoá token (hoặc session cookie)
  const cookie = serialize("token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ message: "Logged out" });
}
