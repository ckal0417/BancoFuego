import { Router } from "express";
import { RedBancariaTestingController }
    from "../Controllers/Testing/RedBancariaTestingController";


const router =
    Router();


const controller =
    new RedBancariaTestingController();


router.post(
    "/red-bancaria/transferencias-entrantes",
    controller.agregarTransferenciaEntrante
);


export default router;