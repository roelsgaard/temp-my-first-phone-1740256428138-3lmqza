"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(
/*{
  credential: admin.credential.cert({
    projectId: "myfirstphone-123",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5Te0wE79NSbYH\nQAMF7SzQr6H4BzKIGWp7EMyK9XTUc4k+zSKZwbH4Dv6oxeWuTK3B56ORzIWUVweJ\n6djfrGPbL5FsIFFS7KIIbQLdkEwCUPw6OftxA99SuIU2PeRIfDvq3p9wUuZj6Llt\nVb6y1UmRoliFaVV2K9wWs4nH29yz+AaOGd1owv/wrMlW044pGNo1arsBjofpV4uI\nBYBxjGR0eeQdPRjFSMkS+FqwFbScU5rQBA1tYxNUOnafU1Xyg5BgcpzGv2EBoYvu\na8P8a4FUGDyXVpgTesuFCS3dWyFaKTIH+UuGx48p7YkBhnzbhIFIkKXbi+sIoHQI\nqNtddZ47AgMBAAECggEANN0q2+reSgXL1NCprCCoBtb8LZ6cB2C81GQL/l6dGFjn\noA90ngm4pGxesTZX2nxMm8NiEh+XQiT75RfeA52SFT9CTOcBXFdeuGmlBiF61bRV\n6KSO+4RfyyER+9H3VMiAbXZaZPh5eqozcCIkl68qYE5A07qjo2VK0f0hQu+RzJNp\nyNI7Mi9Z1PjL6uh5LeCtSI9kZJXnDtMcd7tQ0ci//edTczo40L6FMiYCiPQHcwXz\nG+qHaA3x0cJz2FWNxh3/KBMqoB7OMMrjk1+3QXMYwSEcLSkuNrPzU4ZNYEEiPhsa\nAfd/Hy8sX7J+Tl/bG0IFrjPl+Is30h48a+xFz79pnQKBgQD2zZhl+dXYneTWRz7J\nHv902Oa+uZ242aL2MYZy/bIhCwd4siiG13NWSFc+L++ft+iElFhWwuohISstGuGy\nP6hSG+oE03zsvRfL1lpfW1/0+h09lknhl/H4bKLbxVIMf0WoVgmYLD9f6VSUHKS6\nDAuk4nz0+gKdNL8B7kQQvT6KZQKBgQDANahfjg4vsRz0EkCtNbmkjG/DLxr+P8Uw\nL/nG36pl0131U9JKl5Lq96ksc+ZoC6X/IQYA8G+Rir+9XydulyAnQbOgQ7JRHHPW\nZTT6VSux+aD95Cyhq/SVWYoe7nOWfc2boZSomkXdWJ2jrezaIkZwg2JpvG8nQ+d9\niLl0jFusHwKBgC0ai7RvQSaSTITghlfpI1RuY1UNxQZIN+D4UhLnzEr/ogDrxj5G\nV5y4IcGKrycoTAUWu0I34uPlFOfsVrzlp1RCJ7V0FQuKzzOAXAm7QEEcCIX91ki1\nJRJ6gBTb7c+83rUR7DT0OSzFDqD2zx/1HZenkKCQpDOotROcQLIyc6CFAoGBAJJU\nx3joB3jbmDVg6Ah2TH0vxa6NYDmMhy0meTyk729SOcgaJpFPUDS+k/cZzaIMrDXO\nCGoSon3lahBcLwMM3xfD92Ld5xXFWZMxveGPkhKO/7gLTMdQyIYjgvoFg85gvHXt\nz+WEfggD/Q+tzBJN4d6qx/PD18PG+KgjvT0z1l71AoGBANcLcpVC/8m7gqBBcyol\n7D8AyQ1Bxape6uhaL5XIsPWLmyAKAR1NOhJsXmUglx4QTIsaYdPMw31niiJG8xNN\n4djF9O3bNJyAerzCfKI5f8sbIUy8BJ3QZjdw3T55Im1rAh2ZypCU2AqI693xuRv6\nU9YQiAND+5Jtwx3wcZa5L6q9\n-----END PRIVATE KEY-----\n",
    clientEmail: "firebase-adminsdk-fbsvc@myfirstphone-123.iam.gserviceaccount.com",
  }),
}*/ );
exports.sendNotification = functions.https.onRequest(async (req, res) => {
    var _a;
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        // Verify the Firebase ID token
        const idToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1];
        if (!idToken) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        await admin.auth().verifyIdToken(idToken);
        // Get the message data from the request body
        const message = req.body;
        if (!message || !message.token || !message.notification) {
            res.status(400).json({ error: 'Invalid message format' });
            return;
        }
        // Send the notification
        await admin.messaging().send(message);
        res.status(200).json({ success: true, message: 'Notification sent successfully' });
    }
    catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});
//# sourceMappingURL=index.js.map