/// <reference types="react" />
// Allow usage of <style jsx> in the codebase without TypeScript errors.
// Provide a minimal, type-safe declaration so TS understands the optional `jsx` prop.
declare namespace JSX {
  interface IntrinsicElements {
    // Permit <style jsx>{`...`}</style> and accept a `jsx` boolean prop
    style: React.DetailedHTMLProps<
      React.StyleHTMLAttributes<HTMLStyleElement>,
      HTMLStyleElement
    > & { jsx?: boolean };
  }
}
