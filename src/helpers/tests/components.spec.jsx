import React from 'react';
import { setUpComponents } from '../components';

import PauseButton from '../../components/PauseButton';
import { TaskCanvasHeader } from '@twilio/flex-ui';

jest.mock('@twilio/flex-ui', () => {
	return {
		TaskCanvasHeader: {
			Content: {
				add: jest.fn(),
			},
		},
	};
});

jest.mock('../../components/PauseButton', () => {
	return jest.fn();
});

describe('setUpComponents', () => {
	beforeEach(() => {
		setUpComponents();
	});

	it('calls add on TaskCanvasHeader', () => {
		expect(TaskCanvasHeader.Content.add).toHaveBeenCalledWith(
			<PauseButton key="conversation-pause-button" />,
			{
				sortOrder: 1,
				if: expect.any(Function),
			}
		);
	});
});
