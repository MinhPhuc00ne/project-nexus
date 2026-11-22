import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Bắt đầu nhanh',
      items: ['getting-started/quickstart', 'getting-started/environment'],
    },
    {
      type: 'category',
      label: 'Kiến trúc & Quyết định (ADR)',
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
      items: ['modules/overview'],
    },
    {
      type: 'category',
      label: 'Frontend & Đa ngôn ngữ',
      items: ['frontend/architecture', 'frontend/ui-specification', 'frontend/i18n-guide'],
    },
    {
      type: 'category',
      label: 'Chất lượng & Kiểm thử',
      items: ['quality/code-standards', 'quality/testing-ci'],
    },
    {
      type: 'category',
      label: 'Vận hành (Runbook)',
      items: ['operations/runbook'],
    },
  ],
};

export default sidebars;
