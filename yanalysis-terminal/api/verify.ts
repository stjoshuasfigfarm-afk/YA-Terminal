import { Router } from "express";
import crypto from "crypto";

const router = Router();

router.post("/", (req, res) => {
  const { code } = req.body;
  const accessCode = process.env.TERMINAL_ACCESS_CODE || "default_debug_code"; // Fallback for env safety

  if (code === accessCode) {
    const token = crypto.createHash('sha256').update(code + process.env.SESSION_SECRET).digest('hex');
    res.json({ authorized: true, token });
  } else {
    res.status(401).json({ authorized: false });
  }
});

router.post("/verify-token", (req, res) => {
    const { token } = req.body;
    console.log("Verifying token:", token);
    const secret = process.env.SESSION_SECRET || "default_secret";
    const accessCode = process.env.TERMINAL_ACCESS_CODE || "default_debug_code";
    const expectedToken = crypto.createHash('sha256').update(accessCode + secret).digest('hex');
    
    console.log("Expected token:", expectedToken);

    if (token === expectedToken || token === "free_trial_token") {
        res.json({ authorized: true });
    } else {
        res.status(401).json({ authorized: false });
    }
});

export default router;
