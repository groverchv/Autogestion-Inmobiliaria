'use strict';

const { simulateTransaction } = require('../config/ledger');

const SIMULATE = process.env.SIMULATE_BLOCKCHAIN !== 'false';

const pagosController = {
    registrar: (req, res) => {
        const { id, contratoId, monto, fecha, tipoPago, stripeTransactionId } = req.body;
        if (!id || !contratoId || !monto) {
            return res.status(400).json({ error: 'Faltan campos requeridos.' });
        }

        try {
            if (SIMULATE) {
                const result = simulateTransaction('registrarPago', { id, contratoId, monto, fecha, tipoPago, stripeTransactionId });
                return res.status(201).json(result);
            } else {
                res.status(501).json({ error: 'Modo gRPC no configurado.' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = pagosController;
