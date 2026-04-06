const { connectDB } = require("./config/db");
const { app } = require("./app");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
