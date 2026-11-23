import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';

export default function ApiReferencePage() {
  const specUrl = useBaseUrl('/openapi/nexus-openapi.json');

  return (
    <Layout title="API Reference" description="Project Nexus OpenAPI 3.0 Specification">
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading API Reference…</div>}>
        {() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { ApiReferenceReact } = require('@scalar/api-reference-react');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('@scalar/api-reference-react/style.css');
          return (
            <ApiReferenceReact
              configuration={{
                url: specUrl,
              }}
            />
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
