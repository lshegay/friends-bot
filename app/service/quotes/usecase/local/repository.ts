import type { QuotesCategory } from '~/entities/quotes';
import type { Err, Ok } from '~lib/errors';

export interface QuotesRepository {
  getQuotesCategories(): Promise<Ok<QuotesCategory[]> | Err<Error>>;
  getQuotesCategory: (id: string) => Promise<Ok<QuotesCategory> | Err<Error>>;
}
