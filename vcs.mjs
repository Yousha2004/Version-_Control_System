#!/usr/bin/env node
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Command } from 'commander';
import chalk from 'chalk';
import * as Diff from 'diff';

class Vcs {
  constructor(repoPath = '.') {
    this.repoPath = path.join(repoPath, '.vcs');
    this.objectsPath = path.join(this.repoPath, 'objects');
    this.headPath = path.join(this.repoPath, 'HEAD');
    this.indexPath = path.join(this.repoPath, 'index');
  }

  // ----- repo -----
  async init() {
    await fs.mkdir(this.objectsPath, { recursive: true });
    try {
      await fs.writeFile(this.headPath, '', { flag: 'wx' });
      await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });
      console.log(chalk.green('Initialized empty VCS repository in .vcs/'));
    } catch {
      console.log(chalk.yellow('Repository already initialized.'));
    }
  }

  // ----- utils -----
  async hashObject(content) {
    return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
  }

  async getCurrentHead() {
    try {
      const head = (await fs.readFile(this.headPath, 'utf-8')).trim();
      return head || null;
    } catch {
      return null;
    }
  }

  async getCommit(hash) {
    try {
      const data = await fs.readFile(path.join(this.objectsPath, hash), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async getObject(hash) {
    return fs.readFile(path.join(this.objectsPath, hash), 'utf-8');
  }

  // ----- index & objects -----
  async updateStagingArea(filePath, fileHash) {
    let index = [];
    try {
      index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
    } catch {
      // create index if missing
      await fs.writeFile(this.indexPath, JSON.stringify([]));
      index = [];
    }
    const i = index.findIndex(f => f.path === filePath);
    if (i >= 0) index[i].hash = fileHash;
    else index.push({ path: filePath, hash: fileHash });
    await fs.writeFile(this.indexPath, JSON.stringify(index));
  }

  // ----- core commands -----
  async add(fileToAdd) {
    const filedata = await fs.readFile(fileToAdd, 'utf-8');
    const fileHash = await this.hashObject(filedata);
    const objPath = path.join(this.objectsPath, fileHash);
    try {
      await fs.access(objPath);
      // object exists; skip write
    } catch {
      await fs.writeFile(objPath, filedata);
    }
    await this.updateStagingArea(fileToAdd, fileHash);
    console.log(chalk.cyan(`added ${fileToAdd}`));
  }

  async commit(message) {
    const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
    if (!index.length) {
      console.log(chalk.yellow('nothing to commit'));
      return;
    }

    const parent = await this.getCurrentHead();
    const commitData = {
      timeStamp: new Date().toISOString(),
      message,
      files: index,
      parent,
    };

    const commitHash = await this.hashObject(JSON.stringify(commitData));
    await fs.writeFile(path.join(this.objectsPath, commitHash), JSON.stringify(commitData));
    await fs.writeFile(this.headPath, commitHash);
    await fs.writeFile(this.indexPath, JSON.stringify([]));

    console.log(chalk.green(`commit ${commitHash}`));
  }

  async log() {
    let head = await this.getCurrentHead();
    if (!head) {
      console.log(chalk.yellow('no commits yet'));
      return;
    }
    while (head) {
      const c = await this.getCommit(head);
      if (!c) break;
      console.log(chalk.blue(`commit ${head}`));
      console.log(`Date: ${c.timeStamp}`);
      console.log(chalk.white(`    ${c.message}\n`));
      head = c.parent;
    }
  }

  // compare HEAD vs its parent (file-level + inline)
  async changes() {
    const head = await this.getCurrentHead();
    if (!head) return console.log(chalk.yellow('no commits yet'));

    const curr = await this.getCommit(head);
    const prev = curr?.parent ? await this.getCommit(curr.parent) : null;

    await this._printDiffBetween(prev, curr);
  }

  // compare <commit> vs its parent (file-level + inline)
  async showCommitDiff(commitHash) {
    const commit = await this.getCommit(commitHash);
    if (!commit) return console.log(chalk.red('commit not found'));
    const parent = commit.parent ? await this.getCommit(commit.parent) : null;

    await this._printDiffBetween(parent, commit);
  }

  // NEW: show file structure before & after a commit (defaults to HEAD)
  async showTree(optionalCommitHash) {
    let targetHash = optionalCommitHash || (await this.getCurrentHead());
    if (!targetHash) return console.log(chalk.yellow('no commits yet'));

    const curr = await this.getCommit(targetHash);
    if (!curr) return console.log(chalk.red('commit not found'));
    const prev = curr.parent ? await this.getCommit(curr.parent) : null;

    const prevFiles = prev ? prev.files : [];
    const currFiles = curr.files;

    const prevMap = new Map(prevFiles.map(f => [f.path, f.hash]));
    const currMap = new Map(currFiles.map(f => [f.path, f.hash]));

    console.log(chalk.magenta(`\n== File structure @ ${targetHash} ==`));
    console.log(chalk.gray('Before (parent):'));
    if (prevFiles.length === 0) console.log(chalk.gray('  <empty>'));
    else prevFiles
      .map(f => f.path)
      .sort()
      .forEach(p => console.log(chalk.gray(`  ${p}`)));

    console.log(chalk.gray('\nAfter (commit):'));
    if (currFiles.length === 0) console.log(chalk.gray('  <empty>'));
    else currFiles
      .map(f => f.path)
      .sort()
      .forEach(p => console.log(chalk.gray(`  ${p}`)));

    console.log(chalk.cyan('\nChanges:'));
    // additions / modifications
    for (const [file, h] of currMap) {
      if (!prevMap.has(file)) console.log(chalk.green(`+ ${file}`));
      else if (prevMap.get(file) !== h) console.log(chalk.yellow(`~ ${file}`));
    }
    // deletions
    for (const [file] of prevMap) {
      if (!currMap.has(file)) console.log(chalk.red(`- ${file}`));
    }
    console.log('');
  }

  // ----- internal printer -----
  async _printDiffBetween(prev, curr) {
    const prevFiles = prev ? prev.files : [];
    const currFiles = curr ? curr.files : [];

    const prevMap = new Map(prevFiles.map(f => [f.path, f.hash]));
    const currMap = new Map(currFiles.map(f => [f.path, f.hash]));

    let add = 0, del = 0, mod = 0;

    // additions / modifications
    for (const [file, hash] of currMap) {
      if (!prevMap.has(file)) {
        add++;
        console.log(chalk.green(`+ ${file}`));
      } else if (prevMap.get(file) !== hash) {
        mod++;
        console.log(chalk.yellow(`~ ${file}`));
        // inline diff
        const oldText = await this.getObject(prevMap.get(file));
        const newText = await this.getObject(hash);
        const hunks = Diff.diffLines(oldText, newText);
        hunks.forEach(part => {
          if (part.added) process.stdout.write(chalk.green(`+ ${part.value}`));
          else if (part.removed) process.stdout.write(chalk.red(`- ${part.value}`));
        });
        if (hunks.some(p => p.added || p.removed)) console.log('');
      }
    }

    // deletions
    for (const [file] of prevMap) {
      if (!currMap.has(file)) {
        del++;
        console.log(chalk.red(`- ${file}`));
      }
    }

    console.log(chalk.gray(`\nsummary: +${add} -${del} ~${mod}\n`));
  }
}

/* ---------------- CLI ---------------- */
const program = new Command();

program
  .command('init')
  .description('initialize repository')
  .action(async () => {
    const vcs = new Vcs();
    await vcs.init();
  });

program
  .command('add <file>')
  .description('add file to staging')
  .action(async file => {
    const vcs = new Vcs();
    await vcs.add(file);
  });

program
  .command('commit <message>')
  .description('commit staged files')
  .action(async message => {
    const vcs = new Vcs();
    await vcs.commit(message);
  });

program
  .command('log')
  .description('show commit history (HEAD → root)')
  .action(async () => {
    const vcs = new Vcs();
    await vcs.log();
  });

program
  .command('changes')
  .description('show changes of HEAD vs its parent (file-level + inline)')
  .action(async () => {
    const vcs = new Vcs();
    await vcs.changes();
  });

program
  .command('show <commit>')
  .description('show changes of a commit vs its parent (file-level + inline)')
  .action(async commitHash => {
    const vcs = new Vcs();
    await vcs.showCommitDiff(commitHash);
  });

program
  .command('tree [commit]')
  .description('show file structure before & after a commit (defaults to HEAD)')
  .action(async commitHash => {
    const vcs = new Vcs();
    await vcs.showTree(commitHash);
  });

program.parse(process.argv);
