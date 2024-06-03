

const mongoose  = require('mongoose')

exports.connectDB = () => {
  const minikubeIP = process.env.MINIKUBE_IP
  const nodePort = process.env.NODE_PORT
  const db = process.env.DB_NAME
  const url = `mongodb://${minikubeIP}:${nodePort}/${db}`

  try {
    mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const dbConnection = mongoose.connection;
  dbConnection.once("open", (_) => {
    console.log(`Database connected: ${url}`);
  });

  dbConnection.on("error", (err) => {
    console.error(`connection error: ${err}`);
  });
  return;
}
