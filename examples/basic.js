const Silent = require("../src/lib/app");
const path = require("path");

const app = new Silent();

// Serve a specific static file
app.staticFile("/hello.html", path.join(__dirname, "hello.html"));

// Define a route
app.get("/", async (req, res) => {
  await res.json({ message: "Hello World!" });
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
