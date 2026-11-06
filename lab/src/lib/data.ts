import { requestWithMetadata } from '@tinacms/astro/data';
import client from '../../tina/__generated__/client';

export const getHomepage = () =>
  requestWithMetadata(client.queries.homepage({ relativePath: 'homepage.json' }), { priority: 'primary' });

export type CmsHomepage = Awaited<ReturnType<typeof getHomepage>>['data']['homepage'];
