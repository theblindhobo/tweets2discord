const Twitter = require('twitter');
// const { Webhook, MessageBuilder } = require('webhook-discord');
const Webhook = require('./webhook.js');
const MessageBuilder = require('./builder.js');
const { twitter, webHookURL } = require('./config');

require('dotenv').config();

const client = new Twitter(twitter);
const hook = new Webhook(webHookURL);

/**
 * @type {Object}
 * @param {String} hookName - The name of the webhook.
 * @param {String} username - The username of the Twitter user.
 * @param {String} id - The user ID of the Twitter user.
 */

const tUser = {
    hookName: process.env.HOOK_NAME,
    username: process.env.USERNAME,
    id: process.env.ID
};


console.log(`${process.env.HOOK_NAME} is now online!`);

const stream = client.stream('statuses/filter', { follow: tUser.id });

stream.on('data', e => {
    if (e.user.id_str !== tUser.id) return;
    // console.log(e);

    if(e.retweeted_status != undefined) {
      console.log('[retweeted_status] Retweet.');
    } else if(e.in_reply_to_status_id != null) {
      console.log('[in_reply_to_status_id] Reply.');
    } else if(e.in_reply_to_status_id_str != null) {
      console.log('[in_reply_to_status_id_str] Reply.');
    } else if(e.in_reply_to_user_id != null) {
      console.log('[in_reply_to_user_id] Reply.');
    } else if(e.in_reply_to_user_id_str != null) {
      console.log('[in_reply_to_user_id_str] Reply.');
    } else if(e.in_reply_to_screen_name != null) {
      console.log('[in_reply_to_screen_name] Reply.');
    } else {
      console.log('[else] Original tweet.');
      newTweet(e, e.id_str);
    }

});

stream.on('error', error => {
    console.log('An error has occurred: ', error);
});

/**
 * Takes an ID of a Twitter status update.
 * @param {String} id - The Twitter status ID.
 */
async function newTweet(e, id) {
        try {

            function embedMessage(tweetData) {
              const tweetToDiscord = new MessageBuilder(tweetData.tweetURL)
                .setName(tUser.hookName)
                .setAuthor(tweetData.displayName, tweetData.screenName, tweetData.tweetURL, tweetData.profilePic)
                .setDescription(tweetData.tweet)
                .setColor(tweetData.themeColor)
                .setFooter('Twitter', 'https://img.icons8.com/color/344/twitter--v1.png')
                .setTimestamp();

              if(tweetData.entities.media) tweetToDiscord.setImage(tweetData.entities.media[0].media_url_https);

              console.log(`New tweet posted by ${tweetData.screenName}.`);
              hook.send(tweetToDiscord);
            }


            if(e.truncated) { // extended exists
              const tweetData = {
                  tweet: e.extended_tweet.full_text,
                  id: e.id_str,
                  entities: e.extended_tweet.entities,
                  retweetCount: e.retweet_count,
                  likeCount: e.favorite_count,
                  displayName: e.user.name,
                  screenName: e.user.screen_name,
                  screenURL: `https://twitter.com/${e.user.screen_name}`,
                  profilePic: e.user.profile_image_url_https,
                  themeColor: e.user.profile_link_color,
                  tweetURL: `https://twitter.com/${e.user.screen_name}/status/${e.id_str}`
              };
              embedMessage(tweetData);
            } else if(!e.truncated) {
              const tweet = await client.get('statuses/show', { id });
              const tweetData = {
                  tweet: e.text,
                  id: e.id_str,
                  entities: e.entities,
                  retweetCount: e.retweet_count,
                  likeCount: e.favorite_count,
                  displayName: e.user.name,
                  screenName: e.user.screen_name,
                  screenURL: `https://twitter.com/${e.user.screen_name}`,
                  profilePic: e.user.profile_image_url_https,
                  themeColor: e.user.profile_link_color,
                  tweetURL: `https://twitter.com/${e.user.screen_name}/status/${e.id_str}`
              };
              embedMessage(tweetData);
            }


        } catch (err) {
            console.log('An error has occurred with posting the tweet: ', err);
        }
}
