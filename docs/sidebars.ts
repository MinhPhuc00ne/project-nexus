import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/quickstart', 'getting-started/environment'],
    },
    {
      type: 'category',
      label: 'Architecture and ADRs',
      items: [
        'architecture/system-overview',
        'architecture/database-schema',
        'architecture/business-rules',
        'architecture/state-machines',
        'architecture/design-patterns',
        'architecture/realtime-events',
        'adr/modular-monolith',
        'adr/frontend-i18n',
        'adr/zero-server-sonar',
        'adr/docusaurus-scalar-openapi',
      ],
    },
    {
      type: 'category',
      label: 'Backend Modules',
      items: ['modules/overview', 'modules/chatbot'],
    },
    {
      type: 'category',
      label: 'Frontend and Localization',
      items: [
        'frontend/architecture',
        'frontend/file-guide',
        'frontend/ui-specification',
        'frontend/i18n-guide',
      ],
    },
    {
      type: 'category',
      label: 'Quality and Testing',
      items: ['quality/code-standards', 'quality/testing-ci'],
    },
    {
      type: 'category',
      label: 'Operations Runbook',
      items: ['operations/runbook'],
    },
  ],
};

export default sidebars;
