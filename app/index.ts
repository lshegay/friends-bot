import { Telegraf } from 'telegraf';
import { config } from './config';
import { message } from 'telegraf/filters';

if (!config.token?.length) throw new Error('No Bot Token is used.');

const bot = new Telegraf(config.token);
bot.start((ctx) => ctx.reply('Welcome'))

bot.command('hey', (ctx) => ctx.reply('hey!'))

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
