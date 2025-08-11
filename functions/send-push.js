const webPush = require('web-push');

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

// VAPID 설정
webPush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// 메모리에 저장했던 subscription 임시 사용 (실제론 DB에서 조회)
let subscriptionData = null;

exports.handler = async function(event) {
  if (event.httpMethod === 'POST') {
    const payload = JSON.parse(event.body);

    if (!subscriptionData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No subscription found' }),
      };
    }

    try {
      await webPush.sendNotification(subscriptionData, JSON.stringify(payload));
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Push sent' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ message: 'Use POST method' }),
  };
};
