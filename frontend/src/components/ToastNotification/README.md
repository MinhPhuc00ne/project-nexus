# Toast Notification Component

The `ToastProvider` is mounted once in `App.tsx`. All descendant pages and components consume notifications using the `useToast` hook:

```tsx
import { useToast } from '@/components/ToastNotification';

const toast = useToast();

toast.success('Changes saved successfully.');
toast.error('Unable to save changes. Please try again.');
```

## Behavior and Guidelines

- Success notifications display in green; failure notifications display in red. Both share identical layout styling in the upper-right corner.
- Notifications dismiss automatically after 4 seconds; each notification maintains an independent timer and close button.
- A maximum of 3 notifications display simultaneously; incoming notifications replace the oldest entry when the queue is full.
- Override default display duration via configuration: `toast.success('Saved.', { duration: 3000 })` (in milliseconds).
- Early dismissal: `const id = toast.error('Error occurred.'); toast.dismiss(id);`.
- Individual pages do not need to import or render presentation components; `ToastProvider` manages rendering and lifecycle transitions globally.
