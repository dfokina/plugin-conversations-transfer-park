import * as Flex from '@twilio/flex-ui';
import React from 'react';

import PauseButton from '../components/PauseButton';
import TransferButton from '../components/PauseButton/TransferButtonComponent';

/**
 * This appends new content to the Chat Canvas (adds Pause button near end chat button)
 *
 * The if: property here is important, this says only add the Pause button if this is CBM-like task
 * and the task has been assigned.
 */
export const setUpComponents = () => {
  Flex.TaskCanvasHeader.Content.add(<PauseButton key="conversation-pause-button" />, {
    sortOrder: 1,
    if: (props) => props.channelDefinition.capabilities.has('Chat') && props.task.taskStatus === 'assigned',
  });

  Flex.TaskCanvasHeader.Content.add(<TransferButton key="transfer-button" />, {
    sortOrder: 1,
    if: (props) => props.channelDefinition.capabilities.has('Chat') && props.task.taskStatus === 'assigned',
  });
};
