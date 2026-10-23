import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createNewRequestPlugin } from './newRequestPlugin';

const Summary = () => <div data-testid="summary">summary</div>;
const operationProps = { get: (key) => ({ method: 'post', path: '/api/v3/us/car/applications' })[key] };

describe('createNewRequestPlugin', () => {
  it('adds a button that calls the handler with the operation method and path', () => {
    const handler = jest.fn();
    const Wrapped = createNewRequestPlugin(() => handler)().wrapComponents.OperationSummary(Summary);
    render(<Wrapped operationProps={operationProps} />);

    fireEvent.click(screen.getByTestId('api-spec-new-request'));
    expect(handler).toHaveBeenCalledWith('post', '/api/v3/us/car/applications');
    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('renders the plain summary without a handler', () => {
    const Wrapped = createNewRequestPlugin(() => null)().wrapComponents.OperationSummary(Summary);
    render(<Wrapped operationProps={operationProps} />);
    expect(screen.queryByTestId('api-spec-new-request')).toBeNull();
  });
});
