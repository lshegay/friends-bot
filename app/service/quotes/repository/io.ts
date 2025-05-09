import type { QuotesCategory } from '~/entities/quotes';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import { ErrorQuoteCategoryNotFound } from '../usecase/local/errors';
import type { QuotesRepository as QuotesUsecaseRepository } from '../usecase/local/repository';

export type Options = {
  categories: Record<
    string,
    {
      title: string;
      titleQuoteBy: string;
      path: string;
    }
  >;
};

export type Dependencies = {};

export class QuotesRepository implements QuotesUsecaseRepository {
  cache = new Map<string, QuotesCategory>();

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {}

  async getQuotesCategories(): Promise<Ok<QuotesCategory[]> | Err<Error>> {
    return ok(
      Object.keys(this.options.categories).map((categoryId) => ({
        ...this.options.categories[categoryId],
        id: categoryId,
        quotes: [],
      })),
    );
  }

  async getQuotesCategory(id: string): Promise<Ok<QuotesCategory> | Err<Error>> {
    if (!(id in this.options.categories)) {
      return err(new ErrorQuoteCategoryNotFound('!(categoryId in this.options.paths)'));
    }

    if (this.cache.has(id)) {
      return ok(this.cache.get(id) as QuotesCategory);
    }

    const category = this.options.categories[id];

    const file = Bun.file(this.options.categories[id].path);
    const fileContentResult = await trycatch(() => file.json());
    if (fileContentResult.result === 'error') {
      return err(new Error('file.json', { cause: fileContentResult.value }));
    }

    const quotes = fileContentResult.value;
    const quotesCategory = {
      id,
      title: category.title,
      titleQuoteBy: category.titleQuoteBy,
      path: category.path,

      quotes,
    };

    this.cache.set(id, quotesCategory);

    return ok(quotesCategory);
  }
}
