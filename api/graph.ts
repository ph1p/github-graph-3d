import chromium from 'chrome-aws-lambda';
import { VercelRequest, VercelResponse } from '@vercel/node';

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

  const browser = await chromium.puppeteer.launch({
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

  console.log(`https://github.com/${options.name}?${params}`);

  await page.goto(`https://github.com/${options.name}?${params}`);

  const weeks = await page.evaluate(() => {
    let highest = 0;
    let lowest = 0;

    return {
      weeks: Array.from(
        document.querySelector('.js-calendar-graph svg g').querySelectorAll('g')
      ).map((node, index) => ({
        days: Array.from(node.querySelectorAll('rect')).map((day) => {
          if (+day.dataset.count > highest) {
            highest = +day.dataset.count;
          }
          if (+day.dataset.count < lowest) {
            lowest = +day.dataset.count;
          }
          return {
            ...day.dataset,
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
  const { name, from, to } = (req.query as unknown) as Options;

  try {
    const weeks = await getGithubGraphWeeks({
      name,
      from,
      to,
    });

    res.send(weeks);
  } catch {
    res.status(400);
    res.send({
      error: true,
    });
  }
}
