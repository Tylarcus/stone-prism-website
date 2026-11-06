import type { IslandRegistry } from '@tinacms/astro/experimental';
import type { QueryResult } from '@tinacms/astro/data';
import type { HomepageQuery } from '../../tina/__generated__/types';
import type { CmsHomepage } from './data';
import { getHomepage } from './data';
import HeroTagline from '../components/HeroTagline.astro';

export const islands: IslandRegistry = {
  hero: {
    fetch: () => getHomepage(),
    component: HeroTagline,
    wrapper: { tag: 'div' },
    propsFromData: (value) => ({
      data: (value as QueryResult<HomepageQuery>).data?.homepage as CmsHomepage | undefined,
    }),
  },
};
