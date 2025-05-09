import { type Err, type Ok, err, ok } from '~lib/errors';
import type { QuotesForismaticRepository } from './repository';
import type { Quote } from '~/entities/quotes';

export type Dependencies = {
  repository: QuotesForismaticRepository;
};

export class QuotesForismaticUsecase {
  constructor(private readonly deps: Dependencies) {}

  async getRandomQuote(): Promise<Ok<Quote> | Err<Error>> {
    const quoteResult = await this.deps.repository.getRandomQuote();
    if (quoteResult.result === 'error') {
      return err(new Error('this.deps.repository.getRandomQuote', { cause: quoteResult.value }));
    }

    return ok(quoteResult.value);
  }
}
