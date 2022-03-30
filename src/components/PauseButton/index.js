// eslint-disable-next-line max-classes-per-file
import React from 'react';
import { Actions, withTheme } from '@twilio/flex-ui';

import { StyledButton } from './styles';

// eslint-disable-next-line import/no-unused-modules
export class PauseButtonComponent extends React.PureComponent {
  render() {
    return (
      <StyledButton
        color={this.props.theme.tokens.textColors}
        background={this.props.theme.tokens.backgroundColors}
        onClick={() => Actions.invokeAction('PauseTask', { task: this.props.task })}
      >
        Pause
      </StyledButton>
    );
  }
}

// eslint-disable-next-line import/no-unused-modules
export default withTheme(PauseButtonComponent);
