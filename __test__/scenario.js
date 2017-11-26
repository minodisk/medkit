const {
  createClient,
  createPost,
  readPost,
  updatePost,
  destroyPost,
  close,
  wait,
} = require('../src/index');
const cheerio = require('cheerio');

jest.setTimeout(60000);

test('CRUD post', async () => {
  const client = await createClient();
  let postId;

  expect.assertions(7);

  {
    // Test createPost() and readPost()
    const title = 'Test for mediumn.createPost()';
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = 'Is post created?';

    postId = await createPost(
      client,
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
    );

    await wait(1000);

    const html = await readPost(client, postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($('h3').text()).toBe(title);
    expect($('h4').text()).toBe(subtitle);
    expect($('p').text()).toBe(text);
  }

  {
    // Test updatePost() and readPost()
    const title = 'Test for mediumn.updatePost()';
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = 'Is post updated?';

    await updatePost(
      client,
      postId,
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
    );

    await wait(1000);

    const html = await readPost(client, postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($('h3').text()).toBe(title);
    expect($('h4').text()).toBe(subtitle);
    expect($('p').text()).toBe(text);
  }

  {
    // Test destroyPost()
    await destroyPost(client, postId);
    try {
      await readPost(client, postId);
    } catch (err) {
      expect(err).toBe('410 Gone');
    }
  }

  close(client);
});
