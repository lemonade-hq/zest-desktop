import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .single-line-editor-wrapper {
    max-width: 400px;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }

  .env-select {
    max-width: 400px;
    width: 100%;
    padding: 0.3rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: inherit;
  }

  .partner-picker {
    position: relative;
    max-width: 400px;
  }

  .partner-panel {
    position: absolute;
    z-index: 20;
    left: 0;
    right: 0;
    margin-top: 2px;
    padding: 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.dropdown.bg};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .partner-filter {
    width: 100%;
    padding: 0.25rem 0.4rem;
    margin-bottom: 0.3rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: inherit;
  }

  .partner-list {
    max-height: 220px;
    overflow-y: auto;
  }

  .partner-option {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0.25rem 0.4rem;
    text-align: left;
    border-radius: 3px;
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
    .partner-meta {
      color: ${(props) => props.theme.colors.text.subtext1};
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }

  .partner-hint {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
    padding: 0.25rem 0.4rem;
  }
  .partner-error {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    padding: 0.25rem 0.4rem;
  }
`;

export default Wrapper;
