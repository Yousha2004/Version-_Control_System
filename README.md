📝 Simple Version Control System (VCS)

A lightweight version control system built in Node.js, inspired by Git.
It supports adding files, committing snapshots, viewing logs, showing diffs, and comparing file trees across commits.

🚀 Features

Initialize a repository (vcs init)

Stage files (vcs add <file>)

Commit staged changes (vcs commit "message")

View commit history (vcs log)

Show changes between commits (vcs changes, vcs show <commit>)

Display file structure before & after a commit (vcs tree [commit])

Inline colored diffs for modified files

⚙️ Setup
1️⃣ Clone the repository
git clone [https://github.com/Yousha2004/Version-_Control_System.git]
cd vcs

2️⃣ Install dependencies

Make sure you have Node.js v18+ installed.

`npm install`

3️⃣ Make the script globally executable
Option A (recommended: via npm link)
`npm link`


Now you can run the vcs command anywhere.

Option B (manual chmod, Linux/macOS)
`chmod +x vcs.mjs`


Run locally with:

`./vcs.mjs <command>`

Option C (Windows PowerShell)

On Windows you can run:

`node vcs.mjs <command>`

📦 Usage
Initialize a repo
`vcs init`


Creates a .vcs/ folder with objects/, HEAD, and index.

Add files
`vcs add file1.txt`


Stages file1.txt for the next commit.

Commit staged files
`vcs commit "Initial commit"`


Saves the current snapshot with a message.

View commit history
`vcs log`


Outputs commit hashes, dates, and messages.

Show changes (HEAD vs parent)
`vcs changes`


Displays added, modified, or deleted files.
For modified files, shows inline diffs:

Green = added lines

Red = removed lines

Show changes of a specific commit
`vcs show <commit-hash>`

Show file structure before & after a commit
`vcs tree [commit-hash]`


If no hash is provided, defaults to HEAD.

Output:

== File structure @ <commit> ==
Before (parent):
  file1.txt
After (commit):
  file1.txt
  file2.txt

Changes:
+ file2.txt   (added)
- old.txt     (deleted)
~ modified.js (changed)

🎨 Example Workflow
vcs init
echo "hello" > a.txt
vcs add a.txt
vcs commit "add a.txt"

echo "world" >> a.txt
vcs add a.txt
vcs commit "update a.txt"

vcs log
vcs changes
vcs tree

📖 Notes

Objects are stored as plain files under .vcs/objects/.

Commits reference parent hashes, forming a chain.

Diffs are powered by diff and colorized with chalk.

🛠️ Dependencies

chalk – colored terminal output

commander – CLI command handling

diff – text difference engine


Do you want me to also add a section with a GIF demo (like asciinema recording) so it looks extra polished on GitHub?
