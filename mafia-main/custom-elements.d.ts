import type React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'playing-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        cid: string;
        bordercolor?: string;
        shadow?: string;
        class?: string;
      };
    }
  }
}
