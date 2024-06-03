const express = require('express');
const { createDeployment, getDeployments, getDeploymentLogs, deleteDeployment } = require('../controllers/deploymentController');
const verifyToken  = require('../middleware/verifyToken');
const router = express.Router();

router.post('/deploy', verifyToken, createDeployment);
router.get('/apps', verifyToken, getDeployments);
router.get('/apps/:id/logs', verifyToken, getDeploymentLogs);
router.delete('/apps/:id', verifyToken, deleteDeployment);

module.exports = router;
