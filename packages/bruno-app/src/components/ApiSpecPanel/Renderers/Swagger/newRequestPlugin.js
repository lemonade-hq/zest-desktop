/**
 * Zest: Swagger UI plugin adding a "New request" button to each operation row.
 * `getHandler()` returns the current `(method, path) => void`, or null to hide the button.
 */
import React from 'react';

export const createNewRequestPlugin = (getHandler) => () => ({
  wrapComponents: {
    OperationSummary: (Original) => (props) => {
      const handler = getHandler();
      if (!handler) return <Original {...props} />;

      const operationProps = props.operationProps;
      const method = operationProps?.get ? operationProps.get('method') : props.method;
      const path = operationProps?.get ? operationProps.get('path') : props.path;

      const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(method, path);
      };

      return (
        <div className="zest-operation-summary">
          <Original {...props} />
          <button
            type="button"
            className="zest-new-request-btn"
            title={`New request from ${String(method).toUpperCase()} ${path}`}
            data-testid="api-spec-new-request"
            onClick={onClick}
          >
            New request
          </button>
        </div>
      );
    }
  }
});
