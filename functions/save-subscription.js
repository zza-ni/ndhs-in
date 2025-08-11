let subscriptionData = null;

exports.handler = async function(event) {
  if (event.httpMethod === 'POST') {
    subscriptionData = JSON.parse(event.body);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Subscription saved" }),
    };
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Use POST method" }),
  };
};
