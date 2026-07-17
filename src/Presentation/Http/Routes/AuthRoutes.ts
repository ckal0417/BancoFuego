import { Router } from "express";
import { authController } from "../../../Bootstrap/CompositionRoot";

const authRoutes = Router();

authRoutes.post(
    "/login",
    authController.login
);

export { authRoutes };