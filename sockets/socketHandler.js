const onlineUsers = require("./onlineUsers");

module.exports = (io) => {
    if (!io) {
        console.error("⚠️ Socket.IO instance is not available!");
        return;
    }
    console.log("✅ Socket.IO handler initialized");  // <-- Add this

    io.on("connection", (socket) => {
        console.log(`✅ New Connection: ${socket.id}`);

        socket.on("joinRoom", (userID) => {
            onlineUsers.set(userID, socket.id);
            console.log("Current Online Users:", Array.from(onlineUsers.entries()));
            io.to(userID).emit("notification", { message: "Test notification from server!" });
        });

        socket.on("disconnect", () => {
            for (const [userID, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userID);
                    break;
                }
            }
            console.log("User disconnected, current users:", Array.from(onlineUsers.entries()));
        });
    });
};
