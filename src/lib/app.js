const http = require("http");
const fs = require("fs");
const path = require("path");

class Silent {
  #routes;
  #middlewares;
  #staticFiles;

  constructor() {
    this.#routes = {};
    this.#middlewares = [];
    this.#staticFiles = {};
  }

  #addRoutes(method, path, ...handlers) {
    if (handlers.length === 0) {
      throw new Error("No handler provided. At least one handler is required.");
    }
    const key = `${method} ${path}`;
    if (this.#routes[key]) {
      throw new Error(`Duplicate route (${key}) found.`);
    }

    this.#routes[key] = handlers;
  }

  #getHandlersAndParamsAndQueryString(url, method) {
    const [requestPath, queryString] = url.split("?");
    const queryParams = Object.fromEntries(new URLSearchParams(queryString));

    for (const key in this.#routes) {
      const [storedMethod, storedRoutePath] = key.split(" ");
      if (storedMethod !== method) continue;

      const storedRouteParts = storedRoutePath.split("/");
      const requestParts = requestPath.split("/");

      if (storedRouteParts.length !== requestParts.length) continue;

      const params = {};
      let isMatch = true;

      for (let i = 0; i < storedRouteParts.length; i++) {
        if (storedRouteParts[i].startsWith(":")) {
          params[storedRouteParts[i].substring(1)] = requestParts[i];
        } else if (storedRouteParts[i] !== requestParts[i]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return { routeHandlers: this.#routes[key], params, queryParams };
      }
    }

    return null;
  }

  #createCustomRes(res) {
    const customRes = Object.create(res);

    customRes.json = (data) => {
      return new Promise((resolve, reject) => {
        res.setHeader("Content-Type", "application/json");
        res.on("error", reject);
        res.end(JSON.stringify(data), resolve);
      });
    };

    customRes.send = (data) => {
      return new Promise((resolve, reject) => {
        res.on("error", reject);
        res.end(data, resolve);
      });
    };

    customRes.status = (statusCode) => {
      res.statusCode = statusCode;
      return customRes;
    };

    return customRes;
  }

  #createCustomReq(req, params, queryParams) {
    const customReq = Object.create(req);

    customReq.params = params || {};
    customReq.query = queryParams || {};

    const chunks = [];
    return new Promise((resolve, reject) => {
      req
        .on("error", reject)
        .on("data", (chunk) => {
          chunks.push(chunk);
        })
        .on("end", () => {
          customReq.buffer = Buffer.concat(chunks);

          const contentType = req.headers["content-type"];
          if (contentType && contentType.includes("application/json")) {
            try {
              customReq.body = JSON.parse(customReq.buffer.toString());
            } catch (error) {
              customReq.body = {};
            }
          }

          //add more content types
          resolve(customReq);
        });
    });
  }

  #createNext(handlers, req, res) {
    let handlerIndex = 0;

    const next = async (error) => {
      if (error) {
        await res
          .status(500)
          .json({ error: error.message || "Internal Server Error" });

        return;
      }

      if (handlerIndex < handlers.length) {
        const handler = handlers[handlerIndex];
        handlerIndex++;

        try {
          await Promise.resolve(handler(req, res, next));
        } catch (err) {
          await next(err);
        }
      }
    };

    return next;
  }

  #addStaticFiles(urlPath, filePath) {
    if (this.#staticFiles[urlPath]) {
      throw new Error( `A static file already exists for this route ${urlPath}.`);
    }

    this.#staticFiles[urlPath] = filePath;
  }

  #staticFilesExecution(url, res) {
    const filePath = this.#staticFiles[url];
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const extname = path.extname(filePath);
      const contentType =
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".gif": "image/gif",
        }[extname] || "application/octet-stream";

      res.writeHead(200, { "Content-Type": contentType });
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  }

  async #handlerExecution(req, res) {
    const { url, method } = req;

    const data = this.#getHandlersAndParamsAndQueryString(url, method);

    if (!data || data === null) {
      if (method === "GET" && this.#staticFiles[url]) {
        this.#staticFilesExecution(url, res);
      } else {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ message: "Not found" }));
      }
      return;
    }

    const { routeHandlers, params, queryParams } = data;

    const customRes = this.#createCustomRes(res);
    const customReq = await this.#createCustomReq(req, params, queryParams);

    const allHandlers = [...this.#middlewares, ...routeHandlers];
    const next = this.#createNext(allHandlers, customReq, customRes);
    await next();
  }

  listen(port, callback) {
    if (!port) {
      throw new Error("Port is required.");
    }
    const server = http.createServer(async (req, res) => {
      try {
        await this.#handlerExecution(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: err.message || "Internal Server Error" })
        );
      }
    });

    server.listen(port, callback);
  }

  get(path, ...handlers) {
    this.#addRoutes("GET", path, ...handlers);
  }

  post(path, ...handlers) {
    this.#addRoutes("POST", path, ...handlers);
  }

  delete(path, ...handlers) {
    this.#addRoutes("DELETE", path, ...handlers);
  }

  put(path, ...handlers) {
    this.#addRoutes("PUT", path, ...handlers);
  }

  patch(path, ...handlers) {
    this.#addRoutes("PATCH", path, ...handlers);
  }

  use(middleware) {
    this.#middlewares.push(middleware);
  }

  staticFile(urlPath = "/", filePath) {
    this.#addStaticFiles(urlPath, filePath);
  }
}

module.exports = Silent;
