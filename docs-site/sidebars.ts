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
      label: 'Kiến trúc & Nghiệp vụ',
      items: [
        'architecture/system-overview',
        'architecture/database-schema',
        'architecture/business-rules',
        'architecture/realtime-events',
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
      items: ['frontend/architecture', 'frontend/i18n-guide'],
    },
    {
      type: 'category',
      label: 'Chất lượng & Kiểm thử',
      items: ['quality/code-standards', 'quality/testing-ci'],
    },
  ],
};

export default sidebars;
