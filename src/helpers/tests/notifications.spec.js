import { Notifications, NotificationType } from '@twilio/flex-ui';

import { setUpNotifications } from '../notifications';

jest.mock('@twilio/flex-ui', () => {
  return {
    Manager: {
      getInstance: jest.fn(() => {
        return {
          strings: {
            ConversationPauseFetchErrorTemplate: '',
          },
        };
      }),
    },
    Notifications: {
      registerNotification: jest.fn(),
    },
    NotificationType: {
      error: '',
    },
  };
});

describe('setUpNotifications', () => {
  beforeEach(() => {
    setUpNotifications();
  });

  it('registers our notification', () => {
    expect(Notifications.registerNotification).toHaveBeenCalledWith({
      id: 'ConversationPauseFetchError',
      content: 'ConversationPauseFetchErrorTemplate',
      type: NotificationType.error,
    });
  });
});
