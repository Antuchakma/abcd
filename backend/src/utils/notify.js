const prisma = require('../config/prisma');
const { getIO } = require('../socket');

/**
 * Creates a DB notification and pushes it via Socket.io to the user's room.
 * @param {number} userId  - User.id to notify
 * @param {string} title
 * @param {string} body
 * @param {string} type    - e.g. 'visit_started', 'visit_completed', 'prescription_issued', 'report_uploaded', 'followup_scheduled'
 * @param {object} data    - optional metadata (visitId, etc.)
 */
async function notifyUser(userId, title, body, type, data = null) {
  try {
    const notif = await prisma.notification.create({
      data: { userId, title, body, type, data: data ?? undefined },
    });
    try {
      getIO().to(`user_${userId}`).emit('notification', {
        id: notif.id,
        title,
        body,
        type,
        data,
        isRead: false,
        createdAt: notif.createdAt,
      });
    } catch (_) {
      // socket may not be initialised in tests
    }
    return notif;
  } catch (err) {
    console.error('[notify] failed to create notification:', err.message);
  }
}

module.exports = { notifyUser };
