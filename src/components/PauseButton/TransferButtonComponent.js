import React from 'react';
import { Actions, withTheme } from '@twilio/flex-ui';

import { StyledButton } from './styles';

// eslint-disable-next-line import/no-unused-modules
export class TransferButtonComponent extends React.PureComponent {
  render() {
    return (
      <StyledButton
        color={this.props.theme.tokens.textColors}
        background={this.props.theme.tokens.backgroundColors}
        onClick={() => Actions.invokeAction('ShowDirectory')}
      >
        Transfer
      </StyledButton>
    );
  }
}

// eslint-disable-next-line import/no-unused-modules
export default withTheme(TransferButtonComponent);
