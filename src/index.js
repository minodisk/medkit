// @flow

const fs = require("fs");
const puppeteer = require("puppeteer");

type Cookie = {};

class ClipboardEvent extends Event {
  clipboardData: DataTransfer;
}

type Client = {
  browser: Browser,
  cookies: Array<Cookie>
};

type Mouse = {
  move(x: number, y: number): Promise<void>,
  down(): Promise<void>,
  up(): Promise<void>
};

type Keyboard = {
  down(key: string): Promise<void>,
  up(key: string): Promise<void>,
  press(key: string, option?: { delay: number }): Promise<void>
};

type Rect = {
  left: number,
  top: number,
  width: number,
  height: number
};

// type Element = {
//   outerHTML: string,
//   innerHTML: string,
//   getBoundingClientRect(): Rect,
//   focus(): void,
// };

type Page = {
  mouse: Mouse,
  keyboard: Keyboard,
  focus(selector: string): Promise<void>,
  setCookie(...cookies: Array<Cookie>): Promise<void>,
  goto(url: string): Promise<void>,
  waitForNavigation({ timeout: number, waitUntil: string }): Promise<void>,
  waitForSelector(selector: string): Promise<void>,
  $(selector: string): Promise<ElementHandle>,
  $eval<T>(selector: string, (e: HTMLElement) => T): Promise<T>,
  evaluate<T>(() => T): Promise<T>,
  evaluate<T, U>((U) => T, u: U): Promise<T>,
  evaluate<T, U, V>((U, V) => T, u: U, v: V): Promise<T>,
  evaluate<T, U, V, W>((U, V, W) => T, u: U, v: V, w: W): Promise<T>,
  evaluateHandle<T>(() => T): Promise<JSHandle<T>>,
  close(): Promise<void>,
  on(type: string, (e: any) => void): void,
  removeListener(type: string, (e: any) => void): void
};

type JSHandle<T> = {
  jsonValue(): T
};

type ElementHandle = {
  click(): Promise<void>,
  type(text: string): Promise<void>,
  asElement(): ElementHandle
};

type Browser = {
  newPage(): Promise<Page>,
  close(): Promise<void>,
  on(type: string, (e: any) => void): void,
  removeListener(type: string, (e: any) => void): void
};

const status = {
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "426": "Upgrade Required",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended"
};

const rEditURL = /^https:\/\/medium\.com\/p\/([\w\d]+)\/edit$/;

const wait = (msec: number): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(resolve, msec);
  });

const readFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, text) => {
      if (err != null) {
        return reject(err);
      }
      resolve(text.toString());
    });
  });

const writeFile = (path: string, data: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, data, err => {
      if (err != null) {
        return reject(err);
      }
      resolve();
    });
  });

const login = (): Promise<Array<Cookie>> =>
  new Promise(async (resolve, reject) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // await page.goto('https://medium.com/me/stories/public');
    await page.goto("https://medium.com/m/signin");
    // await page.screenshot({path: 'example.png'});

    const onChanged = async e => {
      if (e._targetInfo.url !== "https://medium.com/") {
        return;
      }
      browser.removeListener("targetchanged", onChanged);
      const cookies = await page.cookies();
      await browser.close();
      resolve(cookies);
    };
    browser.on("targetchanged", onChanged);
  });

const getCookies = (): Promise<Array<Cookie>> =>
  new Promise(async (resolve, reject) => {
    let cookies;
    try {
      const data = await readFile("cookies.json");
      cookies = JSON.parse(data);
    } catch (err) {
      cookies = await login();
      await writeFile("cookies.json", JSON.stringify(cookies));
    }
    resolve(cookies);
  });

const newPage = (client: Client): Promise<Page> =>
  new Promise(async (resolve, reject) => {
    const page = await client.browser.newPage();
    await page.setCookie(...client.cookies);
    resolve(page);
  });

const waitForPushed = (
  page: Page,
  re: RegExp,
  timeout: number = 0
): Promise<Array<string>> =>
  new Promise((resolve, reject) => {
    // Workaround
    // Page.prototype.waitForNavigation doens't work and 'framenavigated' event isn't fired when the url is changed via History API.
    // See this issue about this problem: https://github.com/GoogleChrome/puppeteer/issues/257
    const intervalId = setInterval(async () => {
      const url = await page.evaluate(() => location.href);
      const matched = url.match(re);
      if (matched == null) {
        return;
      }
      clearInterval(intervalId);
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      resolve(matched);
    }, 100);
    let timeoutId;
    if (timeout != null && timeout > 0) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject(`waiting failed: timeout ${timeout}ms exceeded`);
      }, timeout);
    }
  });

const setDataToClipboard = (
  page: Page,
  type: string,
  data: string
): Promise<void> =>
  new Promise(async (resolve, reject) => {
    await page.evaluate(
      (t, d) => {
        const onCopy = (e: ClipboardEvent): void => {
          e.preventDefault();
          e.clipboardData.setData(t, d);
        };
        (document: any).addEventListener("copy", onCopy);
      },
      type,
      data
    );
    await shortcut(page, "c");
    resolve();
  });

const shortcut = (page: Page, key: string): Promise<void> =>
  new Promise(async (resolve, reject) => {
    await page.keyboard.down("Control");
    await page.keyboard.press(key);
    await page.keyboard.up("Control");
    resolve();
  });

const position = (page: Page, selector: string): Promise<Rect> =>
  new Promise(async (resolve, reject) => {
    const rect = await page.$eval(selector, el => {
      const rect = el.getBoundingClientRect();
      rect.left += window.pageXOffset;
      rect.top += window.pageYOffset;
      const { left, top, width, height } = rect;
      return { left, top, width, height };
    });
    resolve(rect);
  });

const selectRect = (page: Page, selector: string): Promise<void> =>
  new Promise(async (resolve, reject) => {
    const rect = await position(page, selector);
    await page.mouse.move(rect.left, rect.top);
    await page.mouse.down();
    await page.mouse.move(rect.left + rect.width, rect.top + rect.height);
    await page.mouse.up();
    resolve();
  });

const selection = (page: Page): Promise<string> =>
  new Promise(async (resolve, reject) => {
    const jsHandle = await page.evaluateHandle(() => window.getSelection());
    resolve(jsHandle.jsonValue());
  });

const createClient = (): Promise<Client> =>
  new Promise(async (resolve, reject) => {
    const browser = await puppeteer.launch({ headless: false });
    const cookies = await getCookies();
    resolve({ cookies, browser });
  });

const createPost = (client: Client, html: string): Promise<string> =>
  new Promise(async (resolve, reject) => {
    const page = await newPage(client);
    await setDataToClipboard(page, "text/html", html);
    await page.goto(`https://medium.com/new-story`);
    await page.waitForSelector("div.section-inner");
    await page.focus("div.section-inner");
    await shortcut(page, "a");
    await shortcut(page, "v");
    await shortcut(page, "s");
    const matched = await waitForPushed(page, rEditURL);
    await page.close();
    resolve(matched[1]);
  });

const readPost = (client: Client, postId: string): Promise<string> =>
  new Promise(async (resolve, reject) => {
    const page = await newPage(client);
    const onResponse = res => {
      const req = res.request();
      if (
        req.method !== "GET" ||
        req.url !== `https://medium.com/p/${postId}/edit`
      ) {
        return;
      }
      page.removeListener("response", onResponse);
      if (res.status < 400) {
        return;
      }
      page.close().then(() => {
        let statusText = status[res.status];
        if (statusText == null) {
          statusText = "Unknown";
        }
        reject(`${res.status} ${statusText}`);
      });
    };
    page.on("response", onResponse);
    await page.goto(`https://medium.com/p/${postId}/edit`);
    await page.waitForNavigation({ timeout: 0, waitUntil: "load" });
    await page.waitForSelector("div.section-inner");
    const html = await page.$eval("div.section-inner", e => {
      return e.innerHTML;
    });
    await page.close();
    resolve(html);
  });

const updatePost = (
  client: Client,
  postId: string,
  html: string
): Promise<void> =>
  new Promise(async (resolve, reject) => {
    const page = await newPage(client);
    await setDataToClipboard(page, "text/html", html);
    await page.goto(`https://medium.com/p/${postId}/edit`);
    await page.waitForSelector("div.section-inner");
    await page.focus("div.section-inner");
    await shortcut(page, "a");
    await shortcut(page, "v");
    await shortcut(page, "s");
    await page.close();
    resolve();
  });

const destroyPost = (client: Client, postId: string): Promise<void> =>
  new Promise(async (resolve, reject) => {
    const page = await newPage(client);
    await page.goto(`https://medium.com/p/${postId}/edit`);
    {
      await page.waitForSelector(
        'button[data-action="show-post-actions-popover"]'
      );
      const button = await page.$(
        'button[data-action="show-post-actions-popover"]'
      );
      await button.click();
    }
    {
      await page.waitForSelector('button[data-action="delete-post"]');
      const button = await page.$('button[data-action="delete-post"]');
      await button.click();
    }
    {
      await page.waitForSelector('button[data-action="overlay-confirm"]');
      const button = await page.$('button[data-action="overlay-confirm"]');
      await button.click();
    }
    const onResponse = res => {
      const req = res.request();
      if (
        req.method !== "DELETE" ||
        req.url !== `https://medium.com/p/${postId}`
      ) {
        return;
      }
      page.removeListener("response", onResponse);
      page.close().then(resolve);
    };
    page.on("response", onResponse);
  });

const close = (client: Client): Promise<void> => client.browser.close();

module.exports = {
  createClient,
  createPost,
  readPost,
  updatePost,
  close,
  wait,
  destroyPost
};
