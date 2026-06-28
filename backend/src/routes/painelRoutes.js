const { Router } = require("express");
const { getPainelClientes, getPainelClientesContexto, getPainelOficina } = require("../controllers/painelController");

const router = Router();

router.get("/oficina", getPainelOficina);
router.get("/clientes", getPainelClientes);
router.get("/clientes/contexto", getPainelClientesContexto);

module.exports = router;
