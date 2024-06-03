require('dotenv').config();


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const deploymentRoutes = require('./routes/deploymentRoutes');
const { connectDB } = require('./config/db');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', deploymentRoutes);
connectDB()

module.exports = app;


