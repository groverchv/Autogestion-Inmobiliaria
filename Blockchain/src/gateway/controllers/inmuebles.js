'use strict';

const { simulateTransaction } = require('../config/ledger');

const SIMULATE = process.env.SIMULATE_BLOCKCHAIN !== 'false';

const inmueblesController = {
    registrar: (req, res) => {
        const { id, titulo, propietarioId, direccion, hashTituloPropiedad } = req.body;
        if (!id || !titulo || !propietarioId || !hashTituloPropiedad) {
            return res.status(400).json({ error: 'Faltan campos requeridos en el body.' });
        }

        try {
            if (SIMULATE) {
                const result = simulateTransaction('registrarInmueble', { id, titulo, propietarioId, direccion, hashTituloPropiedad });
                return res.status(201).json(result);
            } else {
                res.status(501).json({ error: 'Conexión gRPC real con Hyperledger no inicializada.' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    transferir: (req, res) => {
        const { id, nuevoPropietarioId, nuevoHashTitulo } = req.body;
        if (!id || !nuevoPropietarioId || !nuevoHashTitulo) {
            return res.status(400).json({ error: 'Faltan campos requeridos.' });
        }

        try {
            if (SIMULATE) {
                const result = simulateTransaction('transferirPropiedad', { id, nuevoPropietarioId, nuevoHashTitulo });
                return res.json(result);
            } else {
                res.status(501).json({ error: 'Modo gRPC no configurado.' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = inmueblesController;
