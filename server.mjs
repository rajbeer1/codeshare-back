/* eslint-disable no-undef */
import express from 'express';
const app = express();
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors'
app.use(cors())
import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer(app);
const io = new Server(server);
const usersocketmap = {};
function getAllConnectedClients(roomID) {
  return Array.from(io.sockets.adapter.rooms.get(roomID) || []).map(
    (socketId) => {
      return {
        socketId,
        name: usersocketmap[socketId],
      };
    }
  );
}
io.on('connection', (socket) => {
  socket.on('join', ({ roomID, name }) => {
    usersocketmap[socket.id] = name;
    socket.join(roomID);
    const clients = getAllConnectedClients(roomID);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit('joined', {
        clients,
        name,
        socketId: socket.id,
      });
    });
  });

  socket.on('code-change', ({ roomID, code }) => {
    socket.in(roomID).emit('code-change', { code });
  });
  socket.on('sync-code', ({ socketId, code }) => {
    console.log(code, socketId);
    io.to(socketId).emit('code-change', { code });
  });
  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit('disconnected', {
        socketId: socket.id,
        name: usersocketmap[socket.id],
      });
    });
    delete usersocketmap[socket.id];
    socket.leave();
  });
});
const port = process.env.PORT;
app.get('/', (req, res) => {
  res.status(200).send('Hello from the server!');
});

server.listen(port, () => {
  console.log(port);
});
