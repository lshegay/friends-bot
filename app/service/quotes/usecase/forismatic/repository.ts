import type { Quote } from '~/entities/quotes';
import type { Err, Ok } from '~lib/errors';

export interface QuotesForismaticRepository {
  getRandomQuote: () => Promise<Ok<Quote> | Err<Error>>;
}
