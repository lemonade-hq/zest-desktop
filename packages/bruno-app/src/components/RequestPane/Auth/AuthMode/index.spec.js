import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { ThemeContext } from 'providers/Theme';
import AuthMode from './index';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch
}));

const renderWithTheme = (ui) =>
  render(
    <ThemeContext.Provider value={{ theme: themes.dark }}>
      <ThemeProvider theme={themes.dark}>{ui}</ThemeProvider>
    </ThemeContext.Provider>
  );

const collection = { uid: 'c1', items: [], root: { request: {} } };
const itemWith = (auth) => ({ uid: 'i1', type: 'http-request', request: { auth } });

describe('RequestPane AuthMode: Lemonade Partner', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('lists a "Lemonade Partner" entry and dispatches the mode change', () => {
    renderWithTheme(<AuthMode item={itemWith({ mode: 'none' })} collection={collection} />);
    fireEvent.click(screen.getByTestId('auth-mode-label'));

    fireEvent.click(screen.getByText('Lemonade Partner'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { itemUid: 'i1', collectionUid: 'c1', mode: 'lemonade-partner' }
      })
    );
  });

  it('shows the selected mode label', () => {
    renderWithTheme(<AuthMode item={itemWith({ mode: 'lemonade-partner', lemonadePartner: { env: 'sandbox', partnerPublicId: 'p' } })} collection={collection} />);
    expect(screen.getByTestId('auth-mode-label')).toHaveTextContent('Lemonade Partner');
    expect(screen.queryByTestId('lemonade-partner-production-badge')).not.toBeInTheDocument();
  });

  it('shows a production badge when env is production', () => {
    renderWithTheme(<AuthMode item={itemWith({ mode: 'lemonade-partner', lemonadePartner: { env: 'production', partnerPublicId: 'p' } })} collection={collection} />);
    expect(screen.getByTestId('lemonade-partner-production-badge')).toHaveTextContent('production');
  });

  it('resolves {{env}} from the active environment for the badge', () => {
    const withEnv = {
      ...collection,
      activeEnvironmentUid: 'e1',
      environments: [{ uid: 'e1', name: 'prod', variables: [{ name: 'env', value: 'production', enabled: true }] }]
    };
    renderWithTheme(<AuthMode item={itemWith({ mode: 'lemonade-partner' })} collection={withEnv} />);
    expect(screen.getByTestId('lemonade-partner-production-badge')).toBeInTheDocument();
  });
});
