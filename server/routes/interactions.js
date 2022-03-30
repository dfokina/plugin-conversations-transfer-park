require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const createError = require('http-errors');
const express = require('express');
const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

const router = express.Router();
const { WORKSPACE_SID, WORKFLOW_SID, INTERACTION_URL, APP_URL } = process.env;
const REINVITE_ENDPOINT = `${APP_URL}/interactions/reinvite`;

async function closeParticipant(interactionSid, channelSid, participantSid) {
  const closeParticipantUrl = `${INTERACTION_URL}/${interactionSid}/Channels/${channelSid}/Participants/${participantSid}`;
  const formData = new FormData();
  formData.append('Status', 'closed');

  const closeParticipantResponse = await axios({
    method: 'post',
    url: closeParticipantUrl,
    data: formData,
    headers: formData.getHeaders(),
    auth: {
      username: process.env.ACCOUNT_SID,
      password: process.env.AUTH_TOKEN,
    },
  });
}

async function inviteParticipant(interactionSid, channelSid, workflowSid, taskChannelUniqueName, taskAttributes) {
  const inviteUrl = `${INTERACTION_URL}/${interactionSid}/Channels/${channelSid}/Invites`;

  /*
   * TODO fix workspace sid
   * TOD fix workflow sid. We now use the same one the original came on. Do we want to have this as a setting or dynamic?
   */
  const routingBody = `{"type":"TaskRouter",
  "properties":{
    "workspace_sid":"${WORKSPACE_SID}",
    "worklow_sid":"${workflowSid}",
    "task_channel_unique_name": "${taskChannelUniqueName}",
    "attributes": ${JSON.stringify(taskAttributes)} } }`;

  const formData = new FormData();
  formData.append('Routing', routingBody);

  // eslint-disable-next-line no-return-await
  return await axios({
    method: 'post',
    url: inviteUrl,
    data: formData,
    headers: formData.getHeaders(),
    auth: {
      username: process.env.ACCOUNT_SID,
      password: process.env.AUTH_TOKEN,
    },
  });
}

async function closeParticipantAndtransfer(interactionSid, channelSid, participantSid, targetSid, taskChannelUniqueName, taskAttributes) {
  const closeParticipantUrl = `${INTERACTION_URL}/${interactionSid}/Channels/${channelSid}/Participants/${participantSid}`
  const formData = new FormData();
  formData.append('Status', 'closed');

  try {
    const closeParticipantResponse = await closeParticipant(interactionSid, channelSid, participantSid);
  } catch (err) {
    console.log(`Could not close participant :( ${err}`)
    return next(createError(500, err.message));
  }

  console.log(`Participant closed successfully`);

  try {
    const inviteResponse = await inviteParticipant(interactionSid, channelSid, WORKFLOW_SID, taskChannelUniqueName, taskAttributes);
    console.log(`Participant invited successfully`);
  } catch (err) {
    console.log(`Could not invite participant :( ${err}`)
    return next(createError(500, err.message));
  }
}

// Dummy cache for when doing an reinvite so we dont more than one for the same 
const REINVITE_REQUEST_CACHE = {}

router.use('/reinvite', async function (req, res, next) {
  const event = req.body;
  console.log(`Got request reinvite: ${JSON.stringify(event)}`);

  const conversationSid = event.ConversationSid;
  let conversation;

  if (REINVITE_REQUEST_CACHE[conversationSid]) {
    return res.status(304).send('Not Modified');
  }

  REINVITE_REQUEST_CACHE[conversationSid] = true;

  try {
    conversation = await client.conversations.conversations(conversationSid).fetch();
  } catch (error) {
    console.log(`Got error when fetching conversation ${error}`);
    return next(createError(500, error.message)); 
  }

  // TODO check if the conversation is closed and create a new interaction instead

  const attributes = JSON.parse(conversation.attributes);
  const { channelSid } = attributes; // Interaction channel
  const { interactionSid } = attributes;

  try {
    await inviteParticipant(
      interactionSid,
      channelSid,
      attributes.workflowSid,
      attributes.taskChannelUniqueName,
      attributes.taskAttributes,
    );
  } catch (error) {
    console.log(`Got error when inviting participant ${error}`);
    return next(createError(500, error.message)); 
  }

  // Remove us from the webhook so we dont get anymore events
  try {
    console.log(`Getting studio webhooks ${conversationSid}`);
    const webhooks = await client.conversations.conversations(conversationSid).webhooks.list();

    for (const webhook of webhooks) {
      if (webhook.configuration.url.endsWith('/reinvite')) {
        try {
          const removeResult = await client.conversations.conversations(conversationSid).webhooks(webhook.sid).remove();
        } catch (e) {
          // TODO depending on error, we need to retry
          console.log(`Coudlnt remove webhook ${webhook.sid} from conversation ${conversationSid}`)
        }
        // Dont break, take them all out in case we managed to get more than one
      }
    }
  } catch (error) {
    console.log(`Got error when configuring webhook ${error}`);
    return next(createError(500, error.message)); 
  } finally {
    delete REINVITE_REQUEST_CACHE[conversationSid];
  }

  return res.send('{}');
});

router.use('/customWrap', async function (req, res, next) {
  const event = req.body;
  console.log(`Got query for interactions ng: ${JSON.stringify(event)}`);

  // parse data form the incoming http request
  const { conversationSid, channelSid, interactionSid, participantSid, taskAttributes } = event;

  /*
   * TODO we should set the message index so we dont miss any messages
   * const messageIdx = event.messageIdx;
   */

  const attributes = event;

  try {
    const closeAction = await closeParticipant(interactionSid, channelSid, participantSid);
  } catch (error) {
    console.log(`Got error when closing participant ${error}`);
    return next(createError(500, error.message)); 
  }

  /*
   * TODO we need the messageIdx so we can replayAfter in case a message comes in while we're doing
   * the custom wrap
   * Set up the webhook that will be invoked when the customer sends a message
   */
  try {
    const webhookConfiguration = {
      target: 'webhook',
      'configuration.method': 'POST',
      'configuration.url': REINVITE_ENDPOINT,
      // 'configuration.replayAfter': messageIdx,
      'configuration.filters': ['onMessageAdded'],
    };

    console.log(`Adding studio webhook to conversation ${conversationSid}`);
    await client.conversations.conversations(conversationSid).webhooks.create(webhookConfiguration);
  } catch (error) {
    console.log(`Got error when configuring webhook ${error}`);
    return next(createError(500, error.message)); 
  }

  try {
    console.log(`Adding conversation attributes ${conversationSid}`);
    const convo = await client.conversations
      .conversations(conversationSid)
      .update({ attributes: `${JSON.stringify(attributes)}` });
  } catch (error) {
    console.log(`Got error when updating attributes ${error}`);
    return next(createError(500, error.message));
  }

  res.send('{}');
});

router.use('/transfer', async function (req, res, next) {
  const event = req.body;
  console.log(`Got query for interactions transfer: ${JSON.stringify(event)}`);

  // parse data form the incoming http request
  const { channelSid, interactionSid, participantSid, targetSid, taskAttribtes, taskChannelUniqueName } = event;

  try {
    // Close participant and invite targetSid
    let invite = await closeParticipantAndtransfer(
      interactionSid,
      channelSid,
      participantSid,
      targetSid,
      taskChannelUniqueName,
      taskAttribtes,
    );
  } catch (err) {
    console.log(`Got error when closing and transferring ${err}`);
    return next(createError(500, err));
  }

  res.status(200).send('');
});

router.use('/', async function(req, res, next) {
  next(createError(404));
});

module.exports = router;
