const { Router } = require("express");
const { login, me, logout, updateOwnPassword, updateSystemPassword } = require("../controllers/authController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { loginRateLimiter } = require("../middlewares/loginRateLimiter");
const { perfisDiretoria } = require("../utils/roles");

const router = Router();

router.post("/login", loginRateLimiter, login);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);
router.patch("/password", authMiddleware, updateOwnPassword);
router.patch("/passwords/:perfil", authMiddleware, roleMiddleware(perfisDiretoria), updateSystemPassword);

module.exports = router;
