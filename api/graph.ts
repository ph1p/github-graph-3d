import { VercelRequest, VercelResponse } from '@vercel/node';

let chromium: any = {
  args: []
};
let puppeteer: any;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chromium = (await import('chrome-aws-lambda')).default;
  puppeteer = await import('puppeteer-core');
} else {
  puppeteer = await import('puppeteer');
}
interface Options {
  name: string;
  from?: string;
  to?: string;
}

const getGithubGraphWeeks = async (options: Options) => {
  if (!options.name) {
    throw Error();
  }

  // remove @ sign
  options.name = options.name.replace(/@/g, '');

  const browser = await puppeteer.launch({
    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();

  const params = new URLSearchParams();
  params.append('tab', 'overview');
  if (options.from && options.to) {
    params.append('from', options.from);
    params.append('to', options.to);
  }

  await page.goto(`https://github.com/${options.name}?${params}`);

  const weeks = await page.evaluate(() => {
    let highest = 0;
    let lowest = 0;

    return {
      weeks: Array.from(
        document.querySelectorAll('.js-calendar-graph svg g > g')
      ).map((node) => ({
        days: Array.from(node.querySelectorAll('rect')).map((day) => {
          if (+day.dataset.level! > highest) {
            highest = +day.dataset.level!;
          }
          if (+day.dataset.level! < lowest) {
            lowest = +day.dataset.level!;
          }
          return {
            date: day.dataset.date,
            count: +day.dataset.level!,
          };
        }),
      })),
      highest,
      lowest,
    };
  });

  await browser.close();
  return weeks;
};

export default async function (req: VercelRequest, res: VercelResponse) {
  const { name, from, to } = req.query as unknown as Options;

  try {
    const weeks = await getGithubGraphWeeks({
      name,
      from,
      to,
    });

    res.send(weeks);
  } catch (e) {
    res.status(400);
    res.send({
      error: true,
      e: e.message,
    });
  }
}
