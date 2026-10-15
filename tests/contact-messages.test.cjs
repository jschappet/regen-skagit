const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(fetch) {
 const window = {dispatchEvent() {}, confirm: () => false};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../src/assets/js/contact-messages.js'), 'utf8'), {window, fetch, CustomEvent: class {}, crypto: {randomUUID: () => 'stable-request-key'}});
 return window;
}
test('opening marks read and updates the list; cancelled draft discard preserves text', async () => {
 const calls = [];
 const message = {id: 7, read_at: null};
 const w = setup(async (url, options) => {
  calls.push([url, options]);
  const data = url.endsWith('/read') ? {message: {...message, read_at: 'today'}, unread_count: 0} : url.includes('?') ? {messages: [], total: 0, limit: 30, unread_count: 0} : {message, replies: [], reply_from: 'admin@example.com'};
  return {ok: true, json: async () => data};
 });
 const inbox = w.contactMessageInbox();
 await inbox.open(message);
 assert.equal(calls[1][1].method, 'PUT');
 assert.equal(JSON.parse(calls[1][1].body).read, true);
 assert.equal(inbox.selected.read_at, 'today');
 inbox.body = 'Unsent draft';
 await inbox.open(message);
 assert.equal(calls.length, 3);
 assert.equal(inbox.body, 'Unsent draft');
});
test('lost response retries the same request and saves returned history', async () => {
 const payloads = [];
 const w = setup(async (_, options) => {
  payloads.push(JSON.parse(options.body));
  if (payloads.length === 1) throw new Error('Connection lost');
  return {ok: true, json: async () => ({id: 1, status: 'sent'})};
 });
 const inbox = w.contactMessageInbox();
 Object.assign(inbox, {selected: {id: 7}, replyFrom: 'admin@example.com', subject: 'Reply', body: 'Hello'});
 await inbox.send();
 assert.equal(inbox.uncertain, true);
 await inbox.send();
 assert.equal(payloads[0].request_id, payloads[1].request_id);
 assert.equal(inbox.replies.length, 1);
 assert.equal(inbox.body, '');
});
test('badge hides when site authorization fails', async () => {
 const w = setup(async () => ({ok: false, status: 403}));
 const badge = w.contactMessageBadge();
 badge.$store = {auth: {authenticated: true}};
 await badge.refresh();
 assert.equal(badge.allowed, false);
});
