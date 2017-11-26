# @minodisk/medkit

Medium SDK supports CRUD post(s) for Node.

## Feature

Instead of simply typing in text, it is implemented to write HTML via clipboard.
In other words, you can create, read, update and destroy posts marked up with
some tags permitted by Medium.

## Motivation

I think Medium's editor is an elegant WYSIWYG editor. But, I would like to write
technical posts in another editor and manage version of the posts in Git etc.
When trying to do it, it can not be realized with the
[Medium's official API](https://github.com/Medium/medium-api-docs). Because it
only supports create, it does not support read, update and destroy.

## Installation

npm:

```sh
npm install --save @minodisk/medkit
```

yarn:

```sh
yarn add @minodisk/medkit
```

## Usage

```js
import {
  createClient,
  createPost,
  readPost,
  updatePost,
  destroyPost
} from "@minodisk/medkit";

(async () => {
  const client = await createClient();
  const postId = await createPost(
    client,
    "<h3>Title</h3><h4>Subtitle</h4><p>Text</p>"
  );
  const html = await readPost(client, postId); // -> '<h3>Title</h3><h4>Subtitle</h4><p>Text</p>'
  await updatePost(
    client,
    postId,
    "<h3>Title</h3><h4>Subtitle</h4><p>Modified</p>"
  );
  await destroyPost(client, postId);
})();
```

## API

### `createClient(): Promise<Client>`

`createClient` returns a `Promise`. The `Promise` receives a `client` contains
`puppeteer.Browser` and `cookies` when it completes normally.

### `createPost(client: Client, html: string): Promise<string>`

`createPost` creates a `html` post on the specified `client` and returns a
`Promise`. The `Promise` receives a post ID when it completes normally.

### `readPost(client: Client, postId: string): Promise<string>`

`readPost` read a post with ID `postId` on the `client` and returns a `Promise`.
The `Promise` receives a post formatted with HTML.

### `updatePost(client: Client, postId: string, html: string): Promise<void>`

`updatePost` updates the post whose ID is `postId` to `html` on the `client` and
returns a `Promise`.

### `destroyPost(client: Client, postId: string): Promise<void>`

`destroyPost` destroys the post whose ID is `postId` on the `client` and returns
a `Promise`.

### `close(client: Client): Promise<void>`

`close` closes the `client`.

## FAQ

### How is it realized?

Using with Chromium via
[GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer) and operate
Medium's page and sometime evaluate JavaScript inside the page.

### Why doesn't run with headless mode?

When trying to operate Medium's post edit page in headless mode, some operations
such as paste and selection are not executed properly.
