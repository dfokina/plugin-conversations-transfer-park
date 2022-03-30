import { Actions, TaskHelper, Manager, Notifications, StateHelper } from '@twilio/flex-ui';
import fetch from 'node-fetch';

const SERVER_URL = 'https://3ef1-2601-648-8682-d360-a539-a548-53b2-3191.ngrok.io';

// Once you publish the chat transfer function, place the returned domain in your version of the plugin.

/**
 * This is the function we replaced Flex's default TransferTask action with.
 *
 * First, it inspects the task passing through it, if the task is not chat-based it calls the original
 * Flex TransferTask action. This allows voice transfers to complete as normal.
 *
 * Assuming its a chat task, we initiate a request to our serverless function to iniate the transfer.
 */
export const transferOverride = async (payload, original) => {
  if (!TaskHelper.isCBMTask(payload.task)) {
    return original(payload);
  }

  const channel = StateHelper.getConversationStateForTask(payload.task);

  const participants = await payload.task.getParticipants(payload.task.attributes.flexInteractionChannelSid);
  let agent;
  for (const p of participants) {
    if (p.type === 'agent') {
      agent = p;
      break;
    }
  }

  /*
   * instantiate the manager to get useful info like user identity and token
   * build the request to initiate the transfer
   */
  const manager = Manager.getInstance();
  const body = {
    // Token: manager.user.token,
    channelSid: agent.channelSid,
    taskSid: payload.task.taskSid,
    targetSid: payload.targetSid,
    workerName: manager.user.identity,
    participantSid: agent.participantSid,
    interactionChannelSid: payload.task.attributes.flexInteractionChannelSid,
    interactionSid: agent.interactionSid,
    taskAttribtes: payload.task.attributes,
    taskChannelUniqueName: payload.task.taskChannelUniqueName,
    conversationSid: agent.mediaProperties.conversationSid,
  };

  return fetch(`${SERVER_URL}/Interactions/transfer`, {
    headers: {
      // eslint-disable-next-line sonarjs/no-duplicate-string
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const parkConversation = async (payload, original) => {
  if (!TaskHelper.isCBMTask(payload.task)) {
    return original(payload);
  }

  const participants = await payload.task.getParticipants(payload.task.attributes.flexInteractionChannelSid);
  let agent;
  for (const p of participants) {
    if (p.type === 'agent') {
      agent = p;
      break;
    }
  }

  /*
   * instantiate the manager to get useful info like user identity and token
   * build the request to initiate the transfer
   */
  const manager = Manager.getInstance();
  const body = {
    // Token: manager.user.token,
    channelSid: agent.channelSid,
    interactionSid: agent.interactionSid,
    participantSid: agent.participantSid,
    conversationSid: agent.mediaProperties.conversationSid,
    taskSid: payload.task.taskSid,
    workflowSid: payload.task.workflowSid,
    taskChannelUniqueName: payload.task.taskChannelUniqueName,
    targetSid: payload.targetSid,
    workerName: manager.user.identity,
    taskAttributes: payload.task.attributes,
  };

  const parkUrl = `${SERVER_URL}/interactions/customWrap`;
  return fetch(parkUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const wrapUpDontClose = async (payload, original) => {
  //
  parkConversation(payload, original);
};

export const setUpActions = () => {
  Actions.replaceAction('TransferTask', (payload, original) => transferOverride(payload, original));
  Actions.registerAction('PauseTask', (payload, original) => wrapUpDontClose(payload, original));
};
