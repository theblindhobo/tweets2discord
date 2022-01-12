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
      newTweet('retweet', e, e.id_str);
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
      newTweet('tweet', e, e.id_str);
    }

});

stream.on('error', error => {
    console.log('An error has occurred: ', error);
});

/**
 * Takes an ID of a Twitter status update.
 * @param {String} id - The Twitter status ID.
 */
async function newTweet(type, e, id) {
        try {

            function embedMessage(tweetData) {
              const tweetToDiscord = new MessageBuilder(tweetData.tweetURL)
                .setName(tUser.hookName)
                .setAuthor(tweetData.displayName, tweetData.screenName, tweetData.tweetURL, tweetData.profilePic)
                .setDescription(tweetData.tweet)
                .setColor(tweetData.themeColor)
                .setFooter('Twitter', 'https://img.icons8.com/color/344/twitter--v1.png')
                .setTimestamp();

              if(type == 'retweet') {
                tweetData.displayName = e.retweeted_status.user.name;
                tweetData.screenName = e.retweeted_status.user.screen_name;
                tweetData.tweetURL = `https://twitter.com/${e.retweeted_status.user.screen_name}/status/${e.retweeted_status.id_str}`;
                tweetData.profilePic = e.retweeted_status.user.profile_image_url_https;
                tweetToDiscord.setAuthor(tweetData.displayName, tweetData.screenName, tweetData.tweetURL, tweetData.profilePic)
                tweetToDiscord.setTitle('🔁 RT');
                tweetToDiscord.setDescription(`${tweetData.tweet.split(' ').slice(2).join(' ')}`);
              }
              if(e.is_quote_status) {
                tweetToDiscord.addField(`💭 *quoted:*`, `*@${e.quoted_status.user.screen_name}:* \"*${e.quoted_status.text}* \"`);
                if(!tweetData.entities.media) {
                  if(e.quoted_status.truncated) {
                    tweetToDiscord.setImage(e.quoted_status.extended_tweet.entities.media[0].media_url_https);
                  } else if(!e.quoted_status.truncated) {
                    tweetToDiscord.setImage(e.quoted_status.entities.media[0].media_url_https);
                  }
                }
              }
              if(tweetData.entities.media) tweetToDiscord.setImage(tweetData.entities.media[0].media_url_https);

              console.log(`New tweet posted by ${tweetData.screenName}.`);
              hook.send(tweetToDiscord);
            }

            const tweetData = {
                id: e.id_str,
                retweetCount: e.retweet_count,
                likeCount: e.favorite_count,
                displayName: e.user.name,
                screenName: e.user.screen_name,
                screenURL: `https://twitter.com/${e.user.screen_name}`,
                profilePic: e.user.profile_image_url_https,
                themeColor: e.user.profile_link_color,
                tweetURL: `https://twitter.com/${e.user.screen_name}/status/${e.id_str}`
            };

            // extended exists
            if(e.truncated) {
              tweetData.tweet = e.extended_tweet.full_text;
              tweetData.entities = e.extended_tweet.entities;
              embedMessage(tweetData);
            } else if(!e.truncated) {
              const tweet = await client.get('statuses/show', { id });
              tweetData.tweet = e.text;
              tweetData.entities = e.entities;
              embedMessage(tweetData);
            }


        } catch (err) {
            console.log('An error has occurred with posting the tweet: ', err);
        }
}
