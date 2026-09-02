"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocketServer = setSocketServer;
exports.emitToUser = emitToUser;
exports.emitToShow = emitToShow;
exports.notifyUser = notifyUser;
const prisma_1 = require("../db/prisma");
let io = null;
function setSocketServer(server) {
    io = server;
}
function emitToUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
function emitToShow(showId, event, payload) {
    io?.to(`show:${showId}`).emit(event, payload);
}
async function notifyUser(userId, type, title, body, link) {
    const notification = await prisma_1.prisma.notification.create({ data: { userId, type, title, body, link } });
    emitToUser(userId, 'notification', notification);
    return notification;
}
