import express from "express";
import { apiRoutes } from "./Routes";
import { errorHandler } from "./Middleware/ErrorHandler";
import { notFoundHandler } from "./Middleware/NotFoundHandler";

const app = express();

app.use(express.json());

app.use(
    "/api",
    apiRoutes
);

app.use(notFoundHandler);

app.use(errorHandler);

export { app };