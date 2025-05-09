import type { Quote, QuotesCategory } from '~/entities/quotes';
import { type Err, type Ok, err, ok } from '~lib/errors';
import type { QuotesRepository } from './repository';

export type Dependencies = {
  repository: QuotesRepository;
};

export class QuotesUsecase {
  constructor(private readonly deps: Dependencies) {}

  async getCategories(): Promise<Ok<QuotesCategory[]> | Err<Error>> {
    const categoriesResult = await this.deps.repository.getQuotesCategories();
    if (categoriesResult.result === 'error') {
      return err(
        new Error('this.deps.repository.getQuotesCategories', { cause: categoriesResult.value }),
      );
    }
    const categories = categoriesResult.value;

    return ok(categories);
  }

  async getRandomQuote(
    categoryId: string,
  ): Promise<Ok<{ category: QuotesCategory; quote: Quote }> | Err<Error>> {
    const categoryResult = await this.deps.repository.getQuotesCategory(categoryId);
    if (categoryResult.result === 'error') {
      return err(new Error('this.deps.repository.getQuotes', { cause: categoryResult.value }));
    }

    const category = categoryResult.value;
    if (!category.quotes.length) {
      return err(new Error('quotes.length: no quotes found in category'));
    }

    const index = Math.floor(Math.random() * category.quotes.length);
    const quote = category.quotes[index];

    return ok({
      category,
      quote,
    });
  }
}
