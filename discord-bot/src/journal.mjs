import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
export class Journal {
  constructor(directory) { this.directory = directory; this.rows = {}; }
  async load() {
    await mkdir(this.directory, { recursive: true });
    try { this.rows = JSON.parse(await readFile(join(this.directory, 'posts.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  async record(key, state) {
    this.rows[key] = state;
    const tmp = join(this.directory, 'posts.tmp');
    await writeFile(tmp, JSON.stringify(this.rows), { mode: 0o600 });
    await rename(tmp, join(this.directory, 'posts.json'));
  }
  async sendOnce(key, send) {
    if (this.rows[key]) return false;
    // Persist uncertainty BEFORE sending: crash/reply loss never triggers a blind duplicate.
    await this.record(key, { state: 'pending' });
    const message = await send();
    await this.record(key, { state: 'sent', messageId: message.id });
    return true;
  }
}