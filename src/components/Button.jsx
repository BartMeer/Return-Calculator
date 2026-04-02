import PropTypes from "prop-types";

/**
 * Unified Button Component
 * Variants: primary, secondary, danger, ghost
 * Sizes: sm, md, lg
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  className = "",
  ...props
}) {
  const baseClasses =
    "font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900";

  const variantClasses = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700",
    secondary:
      "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 focus:ring-gray-400",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700",
    ghost:
      "bg-blue-100 text-blue-600 hover:bg-blue-50 dark:text-blue-100 dark:bg-blue-900 dark:hover:bg-blue-900 focus:ring-blue-400",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
  const widthClasses = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "ghost"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
