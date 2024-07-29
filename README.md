# silent
Silent.js is an Express.js inspired backend web application framework for Node.js.


## Table of Contents

- [Features](#Features)
- [Usage](#Usage)
- [Running an example](#Running-an-example)
- [Contributing](#Contributing)


## Features

- Routing: Supports both static and dynamic routing.
- Middlewares: Easily add and use middleware functions.
- Static File Serving: Serve static files from individual files.
  


## Usage

Here's a quick example to get you started with Silent.js:


### Basic Setup

```
const Silent = require('./Silent');
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


```

### Adding Routes

```

app.post('/user',async (req, res) => {
 await res.status(201).json({ message: 'User created' });
});
```

### Using Middlewares
```
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

### Static file serving

```
app.staticFile("/hello.html", path.join(__dirname, "hello.html"));

```

## Running an example

Here are the steps to run the example locally:

### 1. Fork and Clone the Repository

- Fork the repository on GitHub to your own account.
- Clone the forked repository to your local machine:



```
 git clone https://github.com/your-username/silent.js.git
```


Replace `your-username` with your actual GitHub username.

### 2. Navigate to the Project Directory

Change to the project directory: 
```
cd silent.js
```

### 3. Start the example

Run the example file examples/basic.js:

```
node examples/basic.js
```

## Contributing

Would love to see your contribution.
