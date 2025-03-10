let ioInstance = null;

function initSocket(server) {
    const { Server } = require("socket.io");
    ioInstance = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true,
          },
    });

    return ioInstance;
}

function getIO() {
    if (!ioInstance) {
        throw new Error("Socket.io has not been initialized!");
    }
    return ioInstance;
}

module.exports = { initSocket, getIO };
