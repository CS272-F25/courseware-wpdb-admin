# CS272 wpdb-admin

A tool for initializing WordPress containers for each student.

## How-To-Use

Create three files: `root.secret`, `seed.secret`, `students.secret`.

 - `root.secret` should contain the root password for the MySQL database. You make this up, but make it secure. 16+ characters, numbers, letters, symbols, etc.
 - `seed.secret` should contain a random seed for generating student db passwords. Again, make this secure.
 - `students.secret` should contain every student's @wisc.edu email address, newline delimited,

When this is done, simply run `node index.js` in this directory. A file, `gen.secret.md`, will be generated telling you what to do next.