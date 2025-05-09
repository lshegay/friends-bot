export type Quote = {
  quote: string;
  reference: string;
};

export type QuotesCategory = {
  id: string;

  title: string;
  titleQuoteBy: string;
  path: string;

  quotes: Quote[];
};