import React from "react";
import styled from "@emotion/styled";
import { XloxTheme } from "../../theme/types.js";
import {buttonAppearance} from "@saplings/ui-core";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outlined" | "text";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const StyledButton = styled('button', {
  shouldForwardProp: (prop: string) => !['variant', 'size', 'fullWidth', 'loading'].includes(prop),
})<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-family: ${(props) => (props.theme as XloxTheme).typography.fontFamily};
  font-size: ${(props) => {
    const theme = props.theme as XloxTheme;
    switch (props.size) {
      case "small":
        return "0.75rem";
      case "large":
        return "1rem";
      default:
        return theme.typography.button.fontSize;
    }
  }};
  font-weight: ${(props) => (props.theme as XloxTheme).typography.button.fontWeight};
  line-height: ${(props) => (props.theme as XloxTheme).typography.button.lineHeight};
  padding: ${(props) => {
    const theme = props.theme as XloxTheme;
    switch (props.size) {
      case "small":
        return `${theme.spacing(1)} ${theme.spacing(2)}`;
      case "large":
        return `${theme.spacing(1.5)} ${theme.spacing(4)}`;
      default:
        return `${theme.spacing(1)} ${theme.spacing(3)}`;
    }
  }};
  border-radius: ${(props) => `${(props.theme as XloxTheme).shape.borderRadius}px`};
  width: ${(props) => (props.fullWidth ? "100%" : "auto")};
  transition: all 0.2s ease-in-out;
  opacity: ${(props) => (props.disabled || props.loading ? 0.6 : 1)};
  pointer-events: ${(props) => (props.disabled || props.loading ? "none" : "auto")};

  ${(props) => {
    const theme = props.theme as XloxTheme;
    const style = buttonAppearance(theme,props.variant);
    return `background-color: ${style.backgroundColor}; color: ${style.color}; border: ${style.borderWidth}px solid ${style.borderColor};
      &:hover { background-color: ${style.hoverColor}; }`;

  }}
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  loading = false,
  disabled = false,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      loading={loading}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Loading..." : children}
    </StyledButton>
  );
};

Button.displayName = "Button";
