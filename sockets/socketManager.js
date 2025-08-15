import { Server } from "socket.io";

let ioInstance = null;

function initSocket(server) {
    console.log("Initializing Socket.IO...");

    ioInstance = new Server(server, {
        cors: {
            origin: "*",
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

export { initSocket, getIO };
