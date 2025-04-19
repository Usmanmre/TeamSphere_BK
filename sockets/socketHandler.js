const onlineUsers = require("./onlineUsers");
const Tasks = require("../models/task");

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
        });
        socket.on("joinTaskRoom", (taskId) => {
            socket.join(taskId); // Join the room
            console.log(`Socket ${socket.id} joined task room: ${taskId}`);
          });

        socket.on("task:edit", async ({ taskId, content, editedBy }) => {
            await Tasks.findByIdAndUpdate(taskId, { description: content });
            socket.to(taskId).emit("task:edited", { taskId, content, editedBy });
        })

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
