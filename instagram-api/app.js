import dotenv from 'dotenv';
import Instagram from 'instagram-private-api';

dotenv.config();

function getInstagramClient() {
  const client = new Instagram.IgApiClient();
  client.state.generateDevice(process.env.IG_USERNAME);
  return client;
}

async function getAuthToken(client) {
  // await client.simulate.preLoginFlow();
  const auth = await client.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
  return auth.pk;
}

async function getFollowers(client, authToken) {
  const followersFeed = client.feed.accountFollowers(authToken);
  let response = await followersFeed.request();
  let result = response.users;
  let items = []
  do {
    items = await followersFeed.items();
    result = result.concat(items);
  } while (items.length);
  return result;
}

(async () => {
  const ig = getInstagramClient();
  const authToken = await getAuthToken(ig);
  // const followers = await getFollowers(ig, authToken);
  // console.log('followers count', followers.length);
  // console.log('followers', JSON.stringify(followers));
})();
