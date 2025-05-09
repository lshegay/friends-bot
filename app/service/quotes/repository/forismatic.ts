import type { Quote } from '~/entities/quotes';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import type { QuotesForismaticRepository } from '../usecase/forismatic/repository';

export class ForismaticRepository implements QuotesForismaticRepository {
  async getRandomQuote(): Promise<Ok<Quote> | Err<Error>> {
    const fetchResult = await trycatch(() =>
      fetch('https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=ru'),
    );
    if (fetchResult.result === 'error') {
      return err(new Error('Failed to fetch quote from Forismatic', { cause: fetchResult.value }));
    }

    const dataResult = await trycatch(() => fetchResult.value.json());
    if (dataResult.result === 'error') {
      return err(
        new Error('Failed to parse response from Forismatic', { cause: dataResult.value }),
      );
    }

    if ('quoteText' in dataResult.value) {
      const data = dataResult.value as {
        quoteAuthor: string;
        quoteLink: string;
        quoteText: string;
        senderLink: string;
        senderName: string;
      };

      return ok({ quote: data.quoteText, reference: data.quoteAuthor });
    }

    return err(new Error('Invalid response from Forismatic'));
  }
}
