import chromium from 'chrome-aws-lambda';
import { VercelRequest, VercelResponse } from '@vercel/node';

interface Options {
  name: string;
  from?: string;
  to?: string;
}

interface GitHubGraphWeek {
  level: number;
  count: number;
  date: string;
}
interface GitHubGraphResponse {
  lowest: number;
  highest: number;
  weeks: GitHubGraphWeek[];
}

const getGithubGraphWeeks = async (options: Options): Promise<GitHubGraphResponse> => {
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

  await page.goto(`https://github.com/${options.name}?${params}`);

  const weeks = await page.evaluate(() => {
    let highest = 0;
    let lowest = 0;

    return {
      weeks: Array.from(
        document.querySelector('.js-calendar-graph svg g').querySelectorAll('g')
      ).map((node) => ({
        days: Array.from(node.querySelectorAll('rect')).map((day) => {
          let {
            level,
            count,
            date,
          } = (day.dataset as unknown) as GitHubGraphWeek;

          level = +level;
          count = +count;

          if (count > highest) {
            highest = count;
          }
          if (count < lowest) {
            lowest = count;
          }
          return {
            level,
            count,
            date,
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
